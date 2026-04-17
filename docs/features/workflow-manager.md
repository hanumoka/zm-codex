# Module B: Workflow Manager

## 개요
프로젝트의 개발 워크플로우(개발·버그수정·배포·리뷰 등)를 정의하고, 실행 인스턴스를
노드 파이프라인 및 칸반 이중 뷰로 시각화·조작하는 모듈. Phase 2 + 5b + 7 유지보수
(2026-04-17)까지 거치며 BE/FE/MCP/SSE/E2E 층이 완성되었다.

## 구성 요소

### DB 테이블 (3)
| 테이블 | 역할 | 주요 컬럼 |
|-------|-----|---------|
| `workflows` | 워크플로우 정의 (템플릿) | id, project_id, name, workflow_type, nodes(JSONB), edges(JSONB) |
| `workflow_instances` | 실행 인스턴스 | id, workflow_id, title, current_node, status |
| `step_executions` | 각 노드 실행 이력 | id, instance_id, node_id, status, started_at, completed_at |

- `workflow_type` 유효값: `planning, development, bugfix, deployment, review, custom`
- `instance.status` 유효값: `active, blocked, completed, cancelled`
- `step.status` 유효값: `pending, running, completed, failed, skipped`

### 서비스 계층
| 파일 | 책임 |
|------|------|
| `services/workflow_sync.py` | `.claude/workflows/*.md` ↔ DB 양방향 (export_workflow / import_workflows / import_single_workflow_file / parse_workflow_md), 공통 슬러그 함수 `workflow_file_path` |
| `services/workflow_classifier.py` | 커밋 메시지 패턴에서 workflow_type 자동 분류 |
| `services/seed.py` | `app/resources/workflow_seeds/`의 번들 `.md`를 타겟 프로젝트에 복사 후 import_single_workflow_file을 재사용해 DB 임포트. NULL 바이트/path-traversal 가드, "updated" 경쟁 상황에서 rollback + ValueError |

### BE 라우터 `/api/v1/workflows`

```
GET    /templates                          번들 템플릿 목록 (bugfix/deployment/development/review)
POST   /from-template                      번들 .md → 프로젝트에 시드 (409 on duplicate)
GET    /auto-detect                        커밋 분석으로 workflow_type 추정
POST   /{wf_id}/export                     .claude/workflows/<slug>.md 로 기록
POST   /import?project_id=                 .claude/workflows/*.md 스캔해 DB로 업서트

GET    /                                   목록 (?project_id=)
POST   /                                   수동 생성 (409 on duplicate name)
GET    /{wf_id}                            단건 조회
PATCH  /{wf_id}                            name·description·nodes·edges 갱신 (409 on name 충돌)
DELETE /{wf_id}                            삭제 + 대응 .md 파일 동반 제거 + broadcast

GET    /{wf_id}/instances                  인스턴스 목록
POST   /{wf_id}/instances                  인스턴스 시작 (start 노드 자동 선택)
PATCH  /{wf_id}/instances/{inst_id}        current_node/status 갱신 (step 상태 자동 반영)
DELETE /{wf_id}/instances/{inst_id}        인스턴스 + step 이력 삭제
```

### FE 컴포넌트 (`frontend/src`)
| 파일 | 역할 |
|------|------|
| `pages/WorkflowPage.tsx` | 헤더, 선택 pill 행, 인스턴스 패널, PipelineView / KanbanView, SSE 구독 |
| `components/WorkflowCreateButton.tsx` | '생성' 드롭다운 + 3 모달 (템플릿 픽커·직접 입력·파일에서 가져오기) |
| `components/WorkflowEditActions.tsx` | pill hover 시 노출되는 Download / Pencil / Trash 아이콘 + Export·Rename·Delete 모달 |
| `components/InstancePanel.tsx` | '+ 인스턴스' 헤더, 카드, 펼친 컨트롤 (status 4-way + current_node select + Radar 하이라이트 + Trash 인라인 확인) |
| `components/ModalShell.tsx` | 공용 모달 껍데기 (ESC/외부클릭 닫기) |
| `lib/api/errors.ts::extractApiMessage` | `API Error {code}: {body}` 포맷을 한국어 라벨 메시지로 변환 |
| `stores/workflowStore.ts` | Zustand 스토어 — workflows/instances 상태, highlightedInstanceId, 모든 CRUD·list·execute 액션 |

### SSE 이벤트
BE → FE 양방향 실시간 동기화에 쓰이는 이벤트:
`workflow_created`, `workflow_updated`, `workflow_deleted`, `instance_created`, `instance_updated`, `instance_deleted`.
`WorkflowPage`가 전체를 구독해 현재 선택된 프로젝트의 `fetchWorkflows` 또는 현재 선택된 워크플로우의 `fetchInstances`로 반영한다.

### MCP 도구 (Claude Code 직접 호출)
`POST /api/v1/mcp` JSON-RPC 2.0 채널:

| 도구 | 인자 | 용도 |
|------|------|------|
| `get_workflow_status` | project_id? / workflow_id? | 목록+인스턴스 요약 |
| `create_workflow_from_template` | project_id, template_name | 번들 템플릿 시드 (2026-04-17 추가) |
| `create_instance` | workflow_id, title | 새 인스턴스 시작 (2026-04-17 추가) |
| `update_step_status` | instance_id, node_id, status? | 노드 전진 + 상태 변경 (advance 역할 겸임) |

## UX 흐름

### 번들 템플릿에서 시작
1. 헤더 **생성 ▾ → 템플릿으로 생성**
2. 모달에서 `bugfix / deployment / development / review` 중 선택 → 201 생성, pill 자동 선택
3. 두 번째로 같은 템플릿 클릭 시 **409 "already exists"** 인라인 표시

### 수동 생성 / 리네임 / 삭제
- **생성 ▾ → 직접 입력**: 이름(필수)/설명/유형 모달. 동일 프로젝트 내 중복 이름이면 409
- pill hover 시 오른쪽에 페이지 편집 아이콘 표시:
  - **Download**: Export 모달 → 기록 완료 시 `.claude/workflows/<slug>.md` 경로 표시
  - **Pencil**: 리네임 모달, 충돌 시 409
  - **Trash**: 확인 모달 → 인스턴스·실행 이력·`.md` 파일 모두 제거

### 파일에서 동기화
- **생성 ▾ → 파일에서 가져오기**: `.claude/workflows/*.md` 스캔 후 created/updated/skipped 카운트 표시
- 이름 일치 시 노드/엣지/설명/타입 덮어쓰기

### 인스턴스 실행
1. 워크플로우 선택 후 **+ 인스턴스** → 제목 입력 → start 노드부터 자동 시작
2. 카드 오른쪽 ChevronDown으로 펼침
3. **status 4-way** (진행 중 / 차단 / 완료 / 취소) — BE 유효값과 1:1
4. **current_node 드롭다운** — 선택한 노드는 `running`, 이전 running은 `completed`로 BE가 전이
5. **Radar 토글** — 파이프라인 뷰에서 하이라이트할 인스턴스 명시 선택 (미선택 시 첫 active)
6. **Trash** — "이 인스턴스를 삭제할까요?" 인라인 확인 → 확정 시 DELETE

## 검증
- **pytest** 20건 (backend/tests/): 템플릿 시드/CRUD/중복/traversal/NULL/export·import/인스턴스 DELETE/MCP 왕복
- **Playwright E2E** 3 스펙 (frontend/e2e/pages/): workflow-create, workflow-edit, workflow-instance
- **httpx 스모크**: round-trip 수동 검증 완료 (create→export→delete→import)

## 참조
- 번들 템플릿: `backend/app/resources/workflow_seeds/{bugfix,deployment,development,review}.md`
- 실수 레지스트리: `.claude/rules/known-mistakes.md` (M-004 button>div, M-005 select, M-006 pytest loop, M-007 검증 비대칭)
- 관련 스키마: `backend/app/schemas/workflow.py`
- 모델 정의: `backend/app/models/workflow.py`

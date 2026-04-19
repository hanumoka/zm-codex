import type { DriveStep } from "driver.js";

export const PAGE_TOUR_STEPS: Record<string, DriveStep[]> = {
  dashboard: [
    {
      element: "[data-tour='dashboard-header']",
      popover: {
        title: "Dashboard 개요",
        description:
          "등록된 프로젝트의 전체 현황을 실시간으로 보여줍니다. 문서, 메모리, 워크플로우 등 핵심 지표를 한눈에 확인하세요.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='stat-cards']",
      popover: {
        title: "통계 카드",
        description:
          "문서 수, 메모리 청크, 워크플로우, 훅 이벤트 등 8가지 핵심 지표입니다. 프로젝트를 등록하면 자동으로 집계됩니다.",
        side: "bottom",
      },
    },
    {
      element: "[data-tour='doc-type-breakdown']",
      popover: {
        title: "문서 유형 분포",
        description:
          "프로젝트 문서가 어떤 유형(Rule, Agent, Memory, Policy 등)으로 자동 분류되었는지 보여줍니다. 13가지 유형을 지원합니다.",
        side: "top",
      },
    },
    {
      element: "[data-tour='live-feed']",
      popover: {
        title: "실시간 이벤트 피드",
        description:
          "Claude Code 세션에서 발생하는 HTTP 훅 이벤트를 SSE로 실시간 수신합니다. 세션 시작, 도구 호출, 작업 완료 등이 여기에 나타납니다.",
        side: "top",
      },
    },
  ],

  documents: [
    {
      element: "[data-tour='doc-tree']",
      popover: {
        title: "문서 트리",
        description:
          "프로젝트의 모든 문서를 폴더 구조로 탐색합니다. 폴더를 펼치고 파일을 클릭하면 오른쪽에 내용이 표시됩니다.",
        side: "right",
        align: "start",
      },
    },
    {
      element: "[data-tour='doc-type-badges']",
      popover: {
        title: "문서 유형 태그",
        description:
          "각 파일 옆의 색상 태그는 자동 분류 결과입니다. Memory(시안), Policy(녹색), Rule(주황), Agent(보라) 등 13가지 유형을 색상으로 구분합니다.",
        side: "right",
      },
    },
    {
      element: "[data-tour='doc-viewer']",
      popover: {
        title: "문서 미리보기",
        description:
          "선택한 문서의 마크다운 내용을 렌더링합니다. GFM 테이블, 코드 블록을 지원하며 문서 유형과 수정일도 함께 표시됩니다.",
        side: "left",
        align: "start",
      },
    },
    {
      element: "[data-tour='doc-links']",
      popover: {
        title: "관련 커밋 연결",
        description:
          "문서와 관련된 git 커밋을 자동으로 연결합니다. 경로 매칭(파일 경로 일치)과 키워드 매칭(내용 기반) 두 가지 방식을 사용합니다.",
        side: "left",
      },
    },
  ],

  memory: [
    {
      element: "[data-tour='memory-status']",
      popover: {
        title: "메모리 상태",
        description:
          "현재 저장된 청크 수, 임베딩 모델(all-MiniLM-L6-v2), 벡터 차원(384d), 청크 크기를 보여줍니다.",
        side: "bottom",
      },
    },
    {
      element: "[data-tour='memory-ingest']",
      popover: {
        title: "문서 인제스트",
        description:
          "프로젝트 문서를 800자 단위로 청킹하고 벡터 임베딩으로 변환하여 pgvector에 저장합니다. 검색 전에 먼저 한 번 실행하세요.",
        side: "bottom",
      },
    },
    {
      element: "[data-tour='memory-search']",
      popover: {
        title: "시맨틱 검색",
        description:
          "자연어로 질문하면 코사인 유사도 기반으로 가장 관련 있는 메모리 청크를 찾아줍니다. BM25 + 벡터 하이브리드 검색을 지원합니다.",
        side: "bottom",
      },
    },
    {
      element: "[data-tour='memory-wing-filter']",
      popover: {
        title: "Wing 필터",
        description:
          "Memory Palace 구조에서 Wing(대분류)별로 검색 범위를 좁힐 수 있습니다. '전체'를 선택하면 모든 Wing에서 검색합니다.",
        side: "bottom",
      },
    },
    {
      element: "[data-tour='memory-how-it-works']",
      popover: {
        title: "작동 원리",
        description:
          "수집 → 임베딩 → 저장 → 검색의 4단계 파이프라인입니다. 로컬 모델을 사용하므로 외부 API가 필요 없습니다.",
        side: "top",
      },
    },
  ],

  workflows: [
    {
      element: "[data-tour='wf-create']",
      popover: {
        title: "워크플로우 생성",
        description:
          "템플릿(기획, 개발, 버그수정, 배포)에서 새 워크플로우를 생성합니다. 각 템플릿에는 7개 이상의 노드가 미리 정의되어 있습니다.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='wf-auto-detect']",
      popover: {
        title: "자동 감지",
        description:
          "최근 git 커밋의 패턴(feat/fix/docs 등)을 분석하여 현재 진행 중인 워크플로우 유형을 자동으로 감지합니다.",
        side: "bottom",
      },
    },
    {
      element: "[data-tour='wf-view-toggle']",
      popover: {
        title: "뷰 모드 전환",
        description:
          "같은 워크플로우를 두 가지 뷰로 볼 수 있습니다. 파이프라인은 @xyflow/react 노드 그래프, 칸반은 상태별 카드 보드입니다.",
        side: "bottom",
      },
    },
    {
      element: "[data-tour='wf-selector']",
      popover: {
        title: "워크플로우 선택",
        description:
          "프로젝트에 여러 워크플로우를 등록할 수 있습니다. 탭을 클릭하여 전환하세요. 호버하면 이름 변경과 삭제 버튼이 나타납니다.",
        side: "bottom",
      },
    },
    {
      element: "[data-tour='wf-canvas']",
      popover: {
        title: "파이프라인 캔버스",
        description:
          "노드 그래프 에디터입니다. 각 노드에 스킬, 에이전트, 훅이 매핑되어 있으며, 인스턴스 실행 시 진행 상태가 실시간으로 표시됩니다.",
        side: "top",
      },
    },
  ],

  changes: [
    {
      element: "[data-tour='changes-header']",
      popover: {
        title: "통합 변경 타임라인",
        description:
          "git 커밋, 문서 변경, Claude Code 훅 이벤트를 하나의 타임라인으로 통합하여 보여줍니다.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='changes-timeline']",
      popover: {
        title: "타임라인 항목",
        description:
          "보라색은 커밋, 청록색은 문서 변경, 녹색은 훅 이벤트입니다. 각 항목에 변경 파일 목록과 관련 문서 링크가 표시됩니다.",
        side: "left",
        align: "start",
      },
    },
    {
      element: "[data-tour='changes-linked-docs']",
      popover: {
        title: "문서 자동 연결",
        description:
          "커밋과 관련된 문서를 자동으로 연결합니다. 코드 변경 시 어떤 문서가 함께 갱신되어야 하는지 추적하여 드리프트를 방지합니다.",
        side: "top",
      },
    },
  ],

  config: [
    {
      element: "[data-tour='config-summary']",
      popover: {
        title: "설정 현황",
        description:
          ".claude/ 디렉토리의 모든 설정 파일을 유형별(Agent, Rule, Hook, Skill 등)로 분류하여 보여줍니다.",
        side: "bottom",
      },
    },
    {
      element: "[data-tour='config-template']",
      popover: {
        title: "템플릿 생성",
        description:
          "현재 프로젝트의 설정을 템플릿으로 추출합니다. 두 번째 프로젝트를 등록하면 이 템플릿을 적용하여 동일한 설정을 복제할 수 있습니다.",
        side: "bottom",
        align: "end",
      },
    },
    {
      element: "[data-tour='config-history']",
      popover: {
        title: "변경 이력",
        description:
          "설정 파일의 생성, 수정, 삭제를 시간순으로 추적합니다. 파일 감시(Watcher)가 활성화되면 자동으로 기록됩니다.",
        side: "top",
      },
    },
    {
      element: "[data-tour='config-file-list']",
      popover: {
        title: "설정 파일 목록",
        description:
          "유형별로 그룹핑된 설정 파일 목록입니다. 파일 경로, 크기, 최종 수정일을 확인할 수 있습니다.",
        side: "top",
      },
    },
  ],

  watcher: [
    {
      element: "[data-tour='watcher-toggle']",
      popover: {
        title: "감시 제어",
        description:
          "프로젝트 파일 감시를 시작/중지합니다. 감시 중에는 파일 변경이 자동으로 감지되고 인덱싱됩니다. watchfiles(Rust 기반)를 사용합니다.",
        side: "bottom",
        align: "end",
      },
    },
    {
      element: "[data-tour='watcher-status']",
      popover: {
        title: "감시 상태",
        description:
          "현재 상태(감시 중/중지), 감지된 변경 수, 마지막 변경 시각, 드리프트 경고 수를 실시간으로 보여줍니다.",
        side: "bottom",
      },
    },
    {
      element: "[data-tour='watcher-feed']",
      popover: {
        title: "실시간 변경 피드",
        description:
          "파일 생성(NEW), 수정(MOD), 삭제(DEL) 이벤트가 SSE로 실시간 표시됩니다. 최대 100개 항목을 유지합니다.",
        side: "right",
        align: "start",
      },
    },
    {
      element: "[data-tour='watcher-drift']",
      popover: {
        title: "드리프트 감지",
        description:
          "코드는 변경되었지만 관련 문서가 갱신되지 않은 커밋을 경고합니다. 갱신이 필요한 문서도 함께 제안합니다.",
        side: "left",
        align: "start",
      },
    },
  ],

  policies: [
    {
      element: "[data-tour='policies-info']",
      popover: {
        title: "정책 레지스트리 역할",
        description:
          "정책이 여러 문서에 산재하면 불일치가 발생합니다. 이곳이 유일한 진실의 원천(SSOT)이며, 새 작업 접수 시 자동 교차 검증됩니다.",
        side: "bottom",
      },
    },
    {
      element: "[data-tour='policies-content']",
      popover: {
        title: "정책 내용",
        description:
          "policy-registry.md의 전체 내용을 마크다운으로 렌더링합니다. 아키텍처, 기술, 제품, 제약 정책이 구조화되어 있습니다.",
        side: "top",
        align: "start",
      },
    },
    {
      element: "[data-tour='policies-critical']",
      popover: {
        title: "CRITICAL 정책",
        description:
          "BLOCK 수준 정책은 mistake-guard.sh 훅에서 자동으로 차단됩니다. 빨간색 'CRITICAL 정책 강제' 카드에서 확인할 수 있습니다.",
        side: "bottom",
      },
    },
  ],
};

import { driver, type DriveStep, type Config } from "driver.js";
import "driver.js/dist/driver.css";

export function createTourDriver(onComplete: () => void): ReturnType<typeof driver> {
  const config: Config = {
    showProgress: true,
    animate: true,
    overlayColor: "rgba(0,0,0,0.75)",
    stagePadding: 10,
    stageRadius: 10,
    popoverClass: "zm-tour-popover",
    onDestroyed: () => {
      onComplete();
    },
    steps: TOUR_STEPS,
  };

  return driver(config);
}

const TOUR_STEPS: DriveStep[] = [
  {
    popover: {
      title: "zm-codex에 오신 것을 환영합니다!",
      description:
        "Claude Code 종합 관리 시스템입니다. 이 가이드를 통해 핵심 기능을 단계별로 안내해 드립니다. 언제든 건너뛸 수 있으며, 나중에 다시 볼 수 있습니다.\n\n각 페이지를 처음 방문하면 해당 페이지의 상세 가이드도 자동으로 안내됩니다.",
    },
  },
  {
    element: "[data-tour='project-selector']",
    popover: {
      title: "1. 프로젝트 등록",
      description:
        "가장 먼저 모니터링할 프로젝트를 등록하세요. 프로젝트 이름과 로컬 디렉토리 경로를 입력하면 자동으로 문서를 스캔합니다.",
      side: "right",
      align: "start",
    },
  },
  {
    element: "[data-tour='nav-dashboard']",
    popover: {
      title: "2. Dashboard",
      description:
        "프로젝트 전체 현황을 한눈에 볼 수 있습니다. 문서 수, 메모리 청크, 워크플로우, 훅 이벤트 등 주요 통계가 표시됩니다.",
      side: "right",
    },
  },
  {
    element: "[data-tour='nav-documents']",
    popover: {
      title: "3. Documents",
      description:
        "프로젝트의 모든 문서(.md, .yaml 등)를 트리 구조로 탐색하고 내용을 미리볼 수 있습니다. 문서 유형별 자동 분류를 지원합니다.",
      side: "right",
    },
  },
  {
    element: "[data-tour='nav-memory']",
    popover: {
      title: "4. Memory (시맨틱 검색)",
      description:
        "pgvector 기반 시맨틱 벡터 검색입니다. 자연어로 질문하면 관련 문서 청크를 유사도 점수와 함께 찾아줍니다. BM25 + 벡터 하이브리드 검색을 지원합니다.",
      side: "right",
    },
  },
  {
    element: "[data-tour='nav-workflows']",
    popover: {
      title: "5. Workflows",
      description:
        "개발 워크플로우를 시각적으로 관리합니다. 파이프라인 에디터와 칸반 보드 두 가지 뷰를 제공하며, 템플릿에서 새 워크플로우를 생성할 수 있습니다.",
      side: "right",
    },
  },
  {
    element: "[data-tour='nav-changes']",
    popover: {
      title: "6. Changes",
      description:
        "git 커밋과 문서 변경사항을 통합 타임라인으로 추적합니다. 코드와 문서 간 드리프트(불일치)를 감지합니다.",
      side: "right",
    },
  },
  {
    element: "[data-tour='nav-config']",
    popover: {
      title: "7. Config",
      description:
        "Claude Code 설정 파일(.claude/ 구조)을 관리합니다. 설정 변경 이력을 추적하고, 다른 프로젝트에 적용할 수 있는 템플릿을 생성할 수 있습니다.",
      side: "right",
    },
  },
  {
    element: "[data-tour='nav-watcher']",
    popover: {
      title: "8. Watcher",
      description:
        "프로젝트 파일을 실시간으로 감시합니다. 파일이 변경되면 자동으로 인덱싱하고, 코드와 문서 간 드리프트를 감지하여 알림을 보냅니다.",
      side: "right",
    },
  },
  {
    element: "[data-tour='tour-restart-btn']",
    popover: {
      title: "가이드 다시 보기",
      description:
        "이 버튼을 클릭하면 언제든지 이 가이드를 다시 볼 수 있습니다. 이제 프로젝트를 등록하고 zm-codex를 시작해보세요!",
      side: "right",
      align: "end",
    },
  },
];

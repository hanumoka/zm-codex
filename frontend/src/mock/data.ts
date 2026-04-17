// 프로젝트 목록 (Layout 사이드바에서 사용, 추후 API로 전환 예정)

export interface Project {
  id: string;
  name: string;
  path: string;
}

export const mockProjects: Project[] = [
  {
    id: "zm-codex",
    name: "zm-codex",
    path: "C:\\Users\\amagr\\hanumoka\\examples\\zm-codex",
  },
];

export interface GitHubUser {
  login: string;
  name: string | null;
  avatar_url: string;
  html_url: string;
}

export interface GitHubRepoInfo {
  full_name: string;
  default_branch: string;
  html_url: string;
  private: boolean;
  permissions?: {
    admin?: boolean;
    maintain?: boolean;
    push?: boolean;
    triage?: boolean;
    pull?: boolean;
  };
}

export interface GitHubDirectoryEntry {
  type: 'file' | 'dir' | 'symlink' | 'submodule';
  name: string;
  path: string;
  sha: string;
  size: number;
  download_url: string | null;
}

export interface GitHubContentFile extends GitHubDirectoryEntry {
  type: 'file';
  encoding: string;
  content: string;
}

export interface GitHubWriteResult {
  content: {
    name: string;
    path: string;
    sha: string;
    size: number;
  };
  commit: {
    sha: string;
    html_url?: string;
  };
}

export interface GitHubDeleteResult {
  commit: {
    sha: string;
    html_url?: string;
  };
}

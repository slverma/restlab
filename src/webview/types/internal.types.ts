export interface Folder {
  id: string;
  name: string;
  createdAt: number;
  parentId?: string;
  requests?: Request[];
  subfolders?: Folder[];
}

export interface Request {
  id: string;
  name: string;
  folderId: string;
  method: string;
}

export interface ImportProvider {
  id: string;
  name: string;
  icon: React.ReactNode;
}

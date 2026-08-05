export type AppIdeaStatus = 'draft' | 'exploring' | 'building' | 'shipped' | 'archived';

export interface AppIdea {
  id: string;
  userId: number;
  title: string;
  contentMarkdown: string;
  status: AppIdeaStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface AppIdeaCollection {
  ideas: AppIdea[];
  page: number;
  limit: number;
  total: number;
}

export interface CreateAppIdeaInput {
  title: string;
  contentMarkdown?: string;
  status?: AppIdeaStatus;
}

export interface UpdateAppIdeaInput {
  title?: string;
  contentMarkdown?: string;
  status?: AppIdeaStatus;
}

export interface ListAppIdeasOptions {
  search?: string;
  status?: AppIdeaStatus;
  page?: number;
  limit?: number;
}

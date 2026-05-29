import { todoService } from '../../../services/todo.service';
import { todoFolderService } from '../../../services/todo-folder.service';
import { todoTagService } from '../../../services/todo-tag.service';
import type { Todo } from '../../../types/services/todo.types';
import { requireAuth, type GraphQLContext } from '../../utils/error-handler';
import { withValidatedResolver } from '../../utils/validation';
import {
  todoFolderAddInputSchema,
  todoFolderEditInputSchema,
  todoFolderIdArgSchema,
} from '../../../validators/schemas/todo-folder.schemas';
import {
  todoTagAddInputSchema,
  todoTagEditInputSchema,
  todoTagIdArgSchema,
} from '../../../validators/schemas/todo-tag.schemas';
import {
  todoAddInputSchema,
  todoEditInputSchema,
  todoIdArgSchema,
  todoSubtaskAddInputSchema,
  todoSubtaskEditInputSchema,
  todoSubtaskRemoveInputSchema,
  todosListArgsSchema,
} from '../../../validators/schemas/todo.schemas';

function uid(context: { user?: { id: string | number } | null }): number {
  return Number(context.user!.id);
}

export const todoResolvers = {
  Todo: {
    subtasks: async (parent: Todo, _args: unknown, context: { user?: { id: string | number } | null }) => {
      requireAuth(context, 'Todo.subtasks');
      if (parent.subtasks) return parent.subtasks;
      return await todoService.listSubtasksForTodo(parseInt(parent.id, 10));
    },

    subtasksCount: (parent: Todo) => {
      if (parent.subtasksCount) return parent.subtasksCount;
      if (parent.subtasks) {
        return {
          total: parent.subtasks.length,
          completed: parent.subtasks.filter((s) => s.isCompleted).length,
        };
      }
      return { total: 0, completed: 0 };
    },

    tags: async (parent: Todo, _args: unknown, context: { user?: { id: string | number } | null }) => {
      requireAuth(context, 'Todo.tags');
      if (parent.tags) return parent.tags;
      return await todoTagService.listTagsForTodo(parseInt(parent.id, 10));
    },

    folder: async (parent: Todo, _args: unknown, context: GraphQLContext) => {
      requireAuth(context, 'Todo.folder');
      if (parent.folder) return parent.folder;
      if (!parent.folderId) return null;
      return await todoFolderService.getFolderById(parent.folderId, uid(context));
    },
  },

  Query: {
    todo: withValidatedResolver(
      todoIdArgSchema,
      async (_parent, { id }: { id: string }, context) => {
        requireAuth(context, 'todo');
        return await todoService.getTodoById(id, uid(context));
      },
      'todo'
    ),

    todos: withValidatedResolver(
      todosListArgsSchema,
      async (_parent, args, context) => {
        requireAuth(context, 'todos');
        return await todoService.listTodos(uid(context), args);
      },
      'todos'
    ),

    todoTags: async (_parent: unknown, _args: unknown, context: GraphQLContext) => {
      requireAuth(context, 'todoTags');
      return await todoTagService.listTags(uid(context));
    },

    todoTag: withValidatedResolver(
      todoTagIdArgSchema,
      async (_parent, { id }: { id: string }, context) => {
        requireAuth(context, 'todoTag');
        return await todoTagService.getTagById(id, uid(context));
      },
      'todoTag'
    ),

    todoFolders: async (_parent: unknown, _args: unknown, context: GraphQLContext) => {
      requireAuth(context, 'todoFolders');
      return await todoFolderService.listFolders(uid(context));
    },

    todoFolder: withValidatedResolver(
      todoFolderIdArgSchema,
      async (_parent, { id }: { id: string }, context) => {
        requireAuth(context, 'todoFolder');
        return await todoFolderService.getFolderById(id, uid(context));
      },
      'todoFolder'
    ),
  },

  Mutation: {
    todoAdd: withValidatedResolver(
      todoAddInputSchema,
      async (_parent, { input }, context) => {
        requireAuth(context, 'todoAdd');
        return await todoService.createTodo(uid(context), input);
      },
      'todoAdd'
    ),

    todoEdit: withValidatedResolver(
      todoEditInputSchema,
      async (_parent, { input }, context) => {
        requireAuth(context, 'todoEdit');
        const { id, ...fields } = input;
        return await todoService.updateTodo(id, uid(context), fields);
      },
      'todoEdit'
    ),

    todoRemove: withValidatedResolver(
      todoIdArgSchema,
      async (_parent, { id }: { id: string }, context) => {
        requireAuth(context, 'todoRemove');
        return await todoService.deleteTodo(id, uid(context));
      },
      'todoRemove'
    ),

    todoComplete: withValidatedResolver(
      todoIdArgSchema,
      async (_parent, { id }: { id: string }, context) => {
        requireAuth(context, 'todoComplete');
        return await todoService.completeTodo(id, uid(context));
      },
      'todoComplete'
    ),

    todoSubtaskAdd: withValidatedResolver(
      todoSubtaskAddInputSchema,
      async (_parent, { input }, context) => {
        requireAuth(context, 'todoSubtaskAdd');
        return await todoService.createSubtask(uid(context), input);
      },
      'todoSubtaskAdd'
    ),

    todoSubtaskEdit: withValidatedResolver(
      todoSubtaskEditInputSchema,
      async (_parent, { input }, context) => {
        requireAuth(context, 'todoSubtaskEdit');
        const { todoId, subtaskId, ...fields } = input;
        return await todoService.updateSubtask(todoId, subtaskId, uid(context), fields);
      },
      'todoSubtaskEdit'
    ),

    todoSubtaskRemove: withValidatedResolver(
      todoSubtaskRemoveInputSchema,
      async (_parent, { input }, context) => {
        requireAuth(context, 'todoSubtaskRemove');
        const { todoId, subtaskId } = input;
        return await todoService.deleteSubtask(todoId, subtaskId, uid(context));
      },
      'todoSubtaskRemove'
    ),

    todoTagAdd: withValidatedResolver(
      todoTagAddInputSchema,
      async (_parent, { input }, context) => {
        requireAuth(context, 'todoTagAdd');
        return await todoTagService.createTag(uid(context), input);
      },
      'todoTagAdd'
    ),

    todoTagEdit: withValidatedResolver(
      todoTagEditInputSchema,
      async (_parent, { input }, context) => {
        requireAuth(context, 'todoTagEdit');
        const { id, ...fields } = input;
        return await todoTagService.updateTag(id, uid(context), fields);
      },
      'todoTagEdit'
    ),

    todoTagRemove: withValidatedResolver(
      todoTagIdArgSchema,
      async (_parent, { id }: { id: string }, context) => {
        requireAuth(context, 'todoTagRemove');
        return await todoTagService.deleteTag(id, uid(context));
      },
      'todoTagRemove'
    ),

    todoFolderAdd: withValidatedResolver(
      todoFolderAddInputSchema,
      async (_parent, { input }, context) => {
        requireAuth(context, 'todoFolderAdd');
        return await todoFolderService.createFolder(uid(context), input);
      },
      'todoFolderAdd'
    ),

    todoFolderEdit: withValidatedResolver(
      todoFolderEditInputSchema,
      async (_parent, { input }, context) => {
        requireAuth(context, 'todoFolderEdit');
        const { id, ...fields } = input;
        return await todoFolderService.updateFolder(id, uid(context), fields);
      },
      'todoFolderEdit'
    ),

    todoFolderRemove: withValidatedResolver(
      todoFolderIdArgSchema,
      async (_parent, { id }: { id: string }, context) => {
        requireAuth(context, 'todoFolderRemove');
        return await todoFolderService.deleteFolder(id, uid(context));
      },
      'todoFolderRemove'
    ),
  },
};

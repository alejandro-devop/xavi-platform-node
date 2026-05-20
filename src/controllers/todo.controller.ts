import { Request, Response } from 'express';
import { todoService } from '../services/todo.service';
import { successResponse } from '../shared/utils/response';

export async function createTodo(req: Request, res: Response): Promise<void> {
  const { title, description, status, priority, dueDate } = req.body;
  const todo = await todoService.createTodo(req.user!.id, {
    title,
    description,
    status,
    priority,
    dueDate,
  });
  res.status(201).json(successResponse({ todo }));
}

export async function getTodos(req: Request, res: Response): Promise<void> {
  const { status, priority, dueBefore, dueAfter, page = '1', limit = '20' } = req.query;
  const collection = await todoService.listTodos(req.user!.id, {
    status: status as never,
    priority: priority as never,
    dueBefore: dueBefore as string | undefined,
    dueAfter: dueAfter as string | undefined,
    page: parseInt(page as string, 10),
    limit: parseInt(limit as string, 10),
  });
  res.json(successResponse({ todos: collection.todos }));
}

export async function getTodoById(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const todo = await todoService.getTodoById(id, req.user!.id);
  res.json(successResponse({ todo }));
}

export async function updateTodo(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const { title, description, status, priority, dueDate } = req.body;
  const todo = await todoService.updateTodo(id, req.user!.id, {
    title,
    description,
    status,
    priority,
    dueDate,
  });
  res.json(successResponse({ todo }));
}

export async function deleteTodo(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  await todoService.deleteTodo(id, req.user!.id);
  res.json(
    successResponse({
      message: 'Todo deleted successfully',
    })
  );
}

export async function completeTodo(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const todo = await todoService.completeTodo(id, req.user!.id);
  res.json(successResponse({ todo }));
}

export async function createSubtask(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const { title, orderIndex } = req.body;
  const subtask = await todoService.createSubtask(req.user!.id, {
    todoId: id,
    title,
    orderIndex,
  });
  res.status(201).json(successResponse({ subtask }));
}

export async function updateSubtask(req: Request, res: Response): Promise<void> {
  const { id, subtaskId } = req.params;
  const { title, isCompleted, orderIndex } = req.body;
  const subtask = await todoService.updateSubtask(id, subtaskId, req.user!.id, {
    title,
    isCompleted,
    orderIndex,
  });
  res.json(successResponse({ subtask }));
}

export async function deleteSubtask(req: Request, res: Response): Promise<void> {
  const { id, subtaskId } = req.params;
  await todoService.deleteSubtask(id, subtaskId, req.user!.id);
  res.json(
    successResponse({
      message: 'Subtask deleted successfully',
    })
  );
}

import { Router } from 'express';
import { asyncHandler } from '../shared/utils/async-handler';
import { validate } from '../shared/middleware';
import { authMiddleware } from '../shared/middleware/auth';
import {
  createTodo,
  getTodos,
  getTodoById,
  updateTodo,
  deleteTodo,
  completeTodo,
  createSubtask,
  updateSubtask,
  deleteSubtask,
} from '../controllers/todo.controller';
import {
  createTodoSchema,
  getTodosSchema,
  getTodoSchema,
  updateTodoSchema,
  deleteTodoSchema,
  completeTodoSchema,
  createSubtaskSchema,
  updateSubtaskSchema,
  deleteSubtaskSchema,
} from '../validators/todo.validator';

const router = Router();

// All todo routes require authentication
router.use(authMiddleware);

// Todo CRUD routes
router.post('/', validate(createTodoSchema), asyncHandler(createTodo));
router.get('/', validate(getTodosSchema), asyncHandler(getTodos));
router.get('/:id', validate(getTodoSchema), asyncHandler(getTodoById));
router.put('/:id', validate(updateTodoSchema), asyncHandler(updateTodo));
router.delete('/:id', validate(deleteTodoSchema), asyncHandler(deleteTodo));

// Todo action routes
router.post('/:id/complete', validate(completeTodoSchema), asyncHandler(completeTodo));

// Subtask routes
router.post('/:id/subtasks', validate(createSubtaskSchema), asyncHandler(createSubtask));
router.put('/:id/subtasks/:subtaskId', validate(updateSubtaskSchema), asyncHandler(updateSubtask));
router.delete(
  '/:id/subtasks/:subtaskId',
  validate(deleteSubtaskSchema),
  asyncHandler(deleteSubtask)
);

export default router;

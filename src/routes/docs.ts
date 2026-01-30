import { Router } from 'express';
import { getDocumentation, getDocumentationJson } from '../controllers/docs.controller';

const router = Router();

// Documentation routes (no auth required)
router.get('/', getDocumentation);
router.get('/json', getDocumentationJson);

export default router;

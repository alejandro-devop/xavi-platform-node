import { expenseExtractionService } from '../../../services/expense-extraction.service';
import { requireAuth } from '../../utils/error-handler';
import { withValidatedResolver } from '../../utils/validation';
import { expenseExtractionInputSchema } from '../../../validators/schemas/expense-extraction.schemas';

export const expenseExtractionResolvers = {
  Mutation: {
    walletExpenseExtractFromImage: withValidatedResolver(
      expenseExtractionInputSchema,
      async (_: any, { input }: any, context: any) => {
        requireAuth(context, 'walletExpenseExtractFromImage');
        return await expenseExtractionService.extractFromImage(context.user.id, input);
      },
      'walletExpenseExtractFromImage'
    ),
  },
};

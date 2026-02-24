export const healthResolvers = {
  Query: {
    health: () => ({
      status: 'healthy',
      timestamp: new Date(),
    }),
  },
};

/**
 * Re-exports the CreateTask schema from the shared @kudo/schemas package.
 * Kept as a local file so internal imports stay consistent and the schema
 * can be extended with API-specific refinements if needed.
 */
export { CreateTaskSchema, type CreateTask } from '@kudo/schemas';

export { BedrockService } from './bedrock.service';
export { S3StorageService } from './s3-storage.service';
export { LanguageToolService } from './languagetool.service';
export { CloudinaryService } from './cloudinary.service';
export { RunwayService } from './runway.service';

// Re-export types
export type {
  BedrockCredentials,
  BedrockSettings,
  ContentGenerationRequest,
  ContentGenerationResponse,
  ProductDescriptionRequest,
  ProductDescriptionResponse,
} from './bedrock.service';

export type {
  S3Credentials,
  S3Settings,
  UploadOptions,
  UploadResult,
  ImageProcessingOptions,
} from './s3-storage.service';

export type {
  LanguageToolCredentials,
  LanguageToolSettings,
  GrammarCheckRequest,
  GrammarIssue,
  GrammarCheckResult,
  GrammarCheckResponse,
} from './languagetool.service';

export type {
  CloudinaryCredentials,
  CloudinarySettings,
  ProcessImageOptions,
  ProcessImageResult,
} from './cloudinary.service';

export type {
  RunwayCredentials,
  RunwaySettings,
  VideoGenerationRequest,
  VideoGenerationResponse,
  VideoGenerationResult,
} from './runway.service';

// Re-export prompt utilities
export {
  RUNWAY_PRODUCT_PROMPTS,
  getPromptForCategory,
  buildCustomPrompt,
} from './runway-prompts';

export type { RunwayPromptKey } from './runway-prompts';

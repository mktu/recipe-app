import { createGoogle } from '@ai-sdk/google'

const google = createGoogle({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
})

export const geminiEmbedding = google.embeddingModel('gemini-embedding-001')

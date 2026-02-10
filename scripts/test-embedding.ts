import { readFileSync } from "fs";

// .env.local を手動で読み込み
const envFile = readFileSync(".env.local", "utf-8");
for (const line of envFile.split("\n")) {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    process.env[match[1]] = match[2];
  }
}

import { google } from "@ai-sdk/google";
import { embedMany } from "ai";

// コサイン類似度を計算
function cosineSimilarity(a: number[], b: number[]): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

async function main() {
  const testCases = [
    "白だし梅茶漬け",  // レシピタイトル
    "白だし",          // 検索語1
    "白出汁",          // 検索語2（表記ゆれ）
    "お茶漬け",        // 検索語3
    "茶漬け",          // 検索語4
    "カレーライス",    // 関係ない語（比較用）
  ];

  console.log("埋め込みを生成中...\n");

  const { embeddings } = await embedMany({
    model: google.embeddingModel("gemini-embedding-001"),
    values: testCases,
  });

  const titleEmbedding = embeddings[0];

  console.log("=== 「白だし梅茶漬け」との類似度 ===\n");
  console.log("検索語\t\t\tベクトル類似度\t判定");
  console.log("-".repeat(50));

  for (let i = 1; i < testCases.length; i++) {
    const similarity = cosineSimilarity(titleEmbedding, embeddings[i]);
    const score = (similarity * 100).toFixed(1);
    const judge = similarity > 0.7 ? "✅ 高い" : similarity > 0.5 ? "△ 中程度" : "❌ 低い";
    const word = testCases[i];
    console.log(`${word.padEnd(16)}\t${score}%\t\t${judge}`);
  }
}

main().catch(console.error);

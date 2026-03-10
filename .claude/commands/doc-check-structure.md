docs/ARCHITECTURE.md と docs/DATABASE_DESIGN.md が実装と乖離していないかチェックしてください。

以下を実装から読み取ってドキュメントと照合してください：
- ディレクトリ・ページ・API・Edge Functions の構造（`src/app/`, `supabase/functions/`）
- DB スキーマ（`supabase/migrations/` を時系列で積み上げて現在のスキーマを復元）
- RPC 関数（migrations 内の CREATE FUNCTION）

乖離があれば列挙して報告し、「更新して」と言われたら修正してください。

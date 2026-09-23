'use client'

import {
  PLACEHOLDER_IMAGES,
  placeholderImagePath,
  type PlaceholderImageKey,
} from '@/lib/recipe/placeholder-images'

interface PlaceholderImagePickerProps {
  value: PlaceholderImageKey | null
  onChange: (value: PlaceholderImageKey | null) => void
}

const OPTION_CLASS =
  'relative flex aspect-square cursor-pointer flex-col overflow-hidden rounded-xl border bg-muted ' +
  'has-[:checked]:border-primary has-[:checked]:ring-2 has-[:checked]:ring-primary ' +
  'has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring'

const LABEL_CLASS = 'absolute inset-x-0 bottom-0 bg-background/80 py-0.5 text-center text-xs'

/**
 * ノートのプレースホルダー画像を選ぶ（Issue #174）。
 *
 * 画像は任意項目なので「なし」も選べる。ネイティブの radio にして、矢印キーでの移動と
 * 選択状態の読み上げをブラウザに任せている。一覧のサムネイルと同じく正方形に切り抜いて見せる。
 */
export function PlaceholderImagePicker({ value, onChange }: PlaceholderImagePickerProps) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium">画像</legend>
      <div className="grid grid-cols-4 gap-2">
        <label className={OPTION_CLASS}>
          <input
            type="radio"
            name="placeholder-image"
            className="sr-only"
            checked={value === null}
            onChange={() => onChange(null)}
          />
          <span className="flex flex-1 items-center justify-center text-2xl">🍳</span>
          <span className={LABEL_CLASS}>なし</span>
        </label>
        {PLACEHOLDER_IMAGES.map(({ key, label }) => (
          <label key={key} className={OPTION_CLASS}>
            <input
              type="radio"
              name="placeholder-image"
              className="sr-only"
              checked={value === key}
              onChange={() => onChange(key)}
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={placeholderImagePath(key)} alt="" className="h-full w-full object-cover" />
            <span className={LABEL_CLASS}>{label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}

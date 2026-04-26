'use client'

import { useState } from 'react'
import { X, ChevronRight } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter, DrawerClose } from '@/components/ui/drawer'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import type { PopularIngredient } from '@/lib/db/queries/ingredients'

const CATEGORY_ORDER = ['肉', '魚介', '野菜', 'きのこ', '卵・乳製品', '豆腐・大豆製品', '穀物・麺類']

function ChipButton({ name, selected, onToggle }: { name: string; selected: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
        selected
          ? 'border-primary bg-primary text-primary-foreground'
          : 'border-border bg-background hover:bg-muted'
      }`}
    >
      {name}
    </button>
  )
}

function FreeTextInput({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const [input, setInput] = useState('')
  const [isComposing, setIsComposing] = useState(false)

  function addFreeText() {
    const trimmed = input.trim()
    if (!trimmed || value.includes(trimmed)) return
    onChange([...value, trimmed])
    setInput('')
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && !isComposing) {
      e.preventDefault()
      addFreeText()
    }
  }

  return (
    <Input
      value={input}
      onChange={(e) => setInput(e.target.value)}
      onKeyDown={handleKeyDown}
      onCompositionStart={() => setIsComposing(true)}
      onCompositionEnd={() => setIsComposing(false)}
      placeholder="リストにないものを入力して Enter…"
    />
  )
}

function IngredientDrawer({
  open, onOpenChange, popularIngredients, value, onChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  popularIngredients: PopularIngredient[]
  value: string[]
  onChange: (v: string[]) => void
}) {
  const byCategory = CATEGORY_ORDER.reduce<Record<string, PopularIngredient[]>>((acc, cat) => {
    const items = popularIngredients.filter((i) => i.category === cat)
    if (items.length) acc[cat] = items
    return acc
  }, {})
  const categories = Object.keys(byCategory)

  function toggle(name: string) {
    onChange(value.includes(name) ? value.filter((v) => v !== name) : [...value, name])
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>食材を選ぶ</DrawerTitle>
        </DrawerHeader>
        <div className="flex-1 overflow-y-auto px-4 pb-2">
          <Tabs defaultValue={categories[0]}>
            <TabsList className="mb-3 h-auto w-full flex-wrap justify-start gap-1 bg-transparent p-0">
              {categories.map((cat) => (
                <TabsTrigger
                  key={cat}
                  value={cat}
                  className="h-auto flex-none rounded-full border px-3 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  {cat}
                </TabsTrigger>
              ))}
            </TabsList>
            {categories.map((cat) => (
              <TabsContent key={cat} value={cat}>
                <div className="flex flex-wrap gap-2">
                  {byCategory[cat].map((ing) => (
                    <ChipButton
                      key={ing.id}
                      name={ing.name}
                      selected={value.includes(ing.name)}
                      onToggle={() => toggle(ing.name)}
                    />
                  ))}
                </div>
              </TabsContent>
            ))}
          </Tabs>
          <div className="mt-4">
            <FreeTextInput value={value} onChange={onChange} />
          </div>
        </div>
        <DrawerFooter>
          <DrawerClose asChild>
            <Button>完了</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}

interface IngredientChipSelectorProps {
  popularIngredients: PopularIngredient[]
  value: string[]
  onChange: (value: string[]) => void
}

export function IngredientChipSelector({ popularIngredients, value, onChange }: IngredientChipSelectorProps) {
  const [open, setOpen] = useState(false)

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-between rounded-md border px-3 py-2 text-sm hover:bg-muted"
      >
        <span className="text-muted-foreground">
          {value.length === 0 ? '食材を選ぶ…' : `${value.length}件選択中`}
        </span>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </button>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {value.map((name) => (
            <Badge key={name} variant="secondary" className="gap-1 py-0.5">
              {name}
              <button
                type="button"
                onClick={() => onChange(value.filter((v) => v !== name))}
                className="ml-0.5 rounded-full hover:bg-muted"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
      <IngredientDrawer
        open={open}
        onOpenChange={setOpen}
        popularIngredients={popularIngredients}
        value={value}
        onChange={onChange}
      />
    </div>
  )
}

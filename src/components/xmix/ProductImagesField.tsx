'use client'

/**
 * ProductImagesField — owner-facing image manager inside the product form.
 * - Main display image (shown on cards across the store)
 * - Up to 8 additional gallery photos
 * - Drag & drop / click upload (auto-compressed client-side), or paste an external URL
 * - Click any photo to make it the main one, × to remove
 */

import { useRef, useState } from 'react'
import { ImagePlus, Star, X, Link2, Loader2 } from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import { t } from '@/lib/i18n'
import type { Lang } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  compressImage, isImageFile, isAllowedImageUrl,
  MAX_PRODUCT_IMAGES, MAX_ORIGINAL_BYTES,
} from '@/lib/image'

export type ImageSlot = {
  key: string
  status: 'existing' | 'url' | 'new'
  /** ready URL for existing/pasted slots */
  url?: string
  /** compressed data URL awaiting upload (new slots) */
  dataUrl?: string
  preview: string
}

let keySeq = 0
const nextKey = () => `img-${Date.now().toString(36)}-${++keySeq}`

export function slotsFromUrls(urls: string[]): ImageSlot[] {
  return urls
    .filter((u) => typeof u === 'string' && u.trim())
    .map((url) => ({ key: nextKey(), status: 'existing' as const, url, preview: url }))
}

export async function uploadSlots(
  slots: ImageSlot[],
  onProgress?: (done: number, total: number) => void
): Promise<string[]> {
  const urls: string[] = []
  const fresh = slots.filter((s) => s.status === 'new' && s.dataUrl)
  let done = 0
  for (const s of slots) {
    if (s.status === 'new' && s.dataUrl) {
      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dataUrl: s.dataUrl }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'upload-failed')
      urls.push(data.url)
      done++
      onProgress?.(done, fresh.length)
    } else if (s.url) {
      urls.push(s.url)
    }
  }
  return urls
}

export function ProductImagesField({
  lang,
  slots,
  onChange,
  disabled,
}: {
  lang: Lang
  slots: ImageSlot[]
  onChange: (slots: ImageSlot[]) => void
  disabled?: boolean
}) {
  const d = t.dash
  const mainInputRef = useRef<HTMLInputElement>(null)
  const addInputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [urlValue, setUrlValue] = useState('')

  const full = slots.length >= MAX_PRODUCT_IMAGES

  const filesToSlots = async (files: FileList | File[]): Promise<ImageSlot[]> => {
    const list = Array.from(files)
    if (!list.length) return []
    const room = MAX_PRODUCT_IMAGES - slots.length
    if (room <= 0) {
      toast({ title: d.imgLimit[lang], variant: 'destructive' })
      return []
    }
    const accepted = list.slice(0, room)
    if (accepted.length < list.length) toast({ title: d.imgLimit[lang], variant: 'destructive' })

    const out: ImageSlot[] = []
    for (const f of accepted) {
      try {
        if (!isImageFile(f)) {
          toast({ title: `${f.name}: ${d.imgBadType[lang]}`, variant: 'destructive' })
          continue
        }
        if (f.size > MAX_ORIGINAL_BYTES) {
          toast({ title: `${f.name}: ${d.imgTooLarge[lang]}`, variant: 'destructive' })
          continue
        }
        setProcessing(true)
        const { dataUrl } = await compressImage(f)
        out.push({ key: nextKey(), status: 'new', dataUrl, preview: dataUrl })
      } catch (e) {
        const msg = e instanceof Error && e.message === 'too-large' ? d.imgTooLarge[lang]
          : e instanceof Error && e.message === 'bad-type' ? d.imgBadType[lang]
          : d.imgProcessFail[lang]
        toast({ title: `${f.name}: ${msg}`, variant: 'destructive' })
      } finally {
        setProcessing(false)
      }
    }
    return out
  }

  const addFiles = async (files: FileList | File[]) => {
    const added = await filesToSlots(files)
    if (added.length) onChange([...slots, ...added])
  }

  const addUrl = () => {
    const u = urlValue.trim()
    if (!u) return
    if (!isAllowedImageUrl(u)) {
      toast({ title: d.invalidUrl[lang], variant: 'destructive' })
      return
    }
    if (full) {
      toast({ title: d.imgLimit[lang], variant: 'destructive' })
      return
    }
    onChange([...slots, { key: nextKey(), status: 'url', url: u, preview: u }])
    setUrlValue('')
  }

  const removeAt = (idx: number) => onChange(slots.filter((_, i) => i !== idx))

  const makeMain = (idx: number) => {
    if (idx === 0) return
    const copy = [...slots]
    const [picked] = copy.splice(idx, 1)
    onChange([picked, ...copy])
  }

  const main = slots[0]
  const rest = slots.slice(1)

  const dropHandlers = {
    onDragOver: (e: React.DragEvent) => { e.preventDefault(); setDragOver(true) },
    onDragLeave: () => setDragOver(false),
    onDrop: (e: React.DragEvent) => {
      e.preventDefault()
      setDragOver(false)
      if (!disabled && !full) void addFiles(e.dataTransfer.files)
    },
  }

  return (
    <div className="space-y-3 sm:col-span-2">
      <div>
        <Label className="text-sm font-bold">{d.imagesSection[lang]}</Label>
        <p className="text-[11px] text-muted-foreground mt-0.5">{d.imagesHint[lang]}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-[auto_1fr] sm:items-start">
        {/* ---- main image ---- */}
        <div className="space-y-1.5">
          <span className="text-xs font-bold text-muted-foreground">{d.mainImage[lang]}</span>
          {main ? (
            <div
              className="group relative h-40 w-40 overflow-hidden rounded-2xl border-2 border-primary/60 shadow-md"
              {...dropHandlers}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={main.preview} alt={d.mainImageSet[lang]} className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => removeAt(0)}
                disabled={disabled}
                aria-label={d.removeImage[lang]}
                className="absolute top-1.5 end-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur transition hover:bg-rose-600"
              >
                <X size={14} />
              </button>
              <span className="absolute bottom-1.5 start-1.5 inline-flex items-center gap-1 rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-bold text-amber-300 backdrop-blur">
                <Star size={10} className="fill-amber-300" /> {lang === 'ar' ? 'رئيسية' : 'Main'}
              </span>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => mainInputRef.current?.click()}
              disabled={disabled || processing}
              className={`flex h-40 w-40 flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed text-center transition-colors ${
                dragOver ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50 hover:bg-secondary/40'
              }`}
              {...dropHandlers}
            >
              {processing ? (
                <Loader2 size={26} className="animate-spin text-primary" />
              ) : (
                <ImagePlus size={26} className="text-primary" />
              )}
              <span className="px-3 text-[11px] font-semibold text-muted-foreground leading-relaxed">
                {d.mainImageHint[lang]}
              </span>
            </button>
          )}
          <input
            ref={mainInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => { void addFiles(e.target.files ?? []); e.currentTarget.value = '' }}
          />
        </div>

        {/* ---- additional gallery ---- */}
        <div className="space-y-2 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-muted-foreground">
              {d.gallery[lang]} {slots.length > 1 && <span className="text-primary">({slots.length - 1})</span>}
            </span>
            {slots.length > 1 && (
              <span className="text-[10px] text-muted-foreground/70">{d.galleryHint[lang]}</span>
            )}
          </div>

          <div className="flex flex-wrap gap-2.5">
            {rest.map((s, i) => (
              <div
                key={s.key}
                className="group relative h-20 w-20 overflow-hidden rounded-xl border border-border shadow-sm"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={s.preview} alt="" className="h-full w-full cursor-pointer object-cover" onClick={() => makeMain(i + 1)} title={d.makeMain[lang]} />
                <button
                  type="button"
                  onClick={() => removeAt(i + 1)}
                  disabled={disabled}
                  aria-label={d.removeImage[lang]}
                  className="absolute top-1 end-1 flex h-[22px] w-[22px] items-center justify-center rounded-full bg-black/60 text-white transition hover:bg-rose-600"
                >
                  <X size={11} />
                </button>
                <button
                  type="button"
                  onClick={() => makeMain(i + 1)}
                  disabled={disabled}
                  aria-label={d.makeMain[lang]}
                  title={d.makeMain[lang]}
                  className="absolute bottom-1 start-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/55 text-amber-300 opacity-0 transition group-hover:opacity-100 hover:bg-black/80"
                >
                  <Star size={10} />
                </button>
              </div>
            ))}

            {!full && (
              <button
                type="button"
                onClick={() => addInputRef.current?.click()}
                disabled={disabled || processing}
                className="flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-border text-muted-foreground transition hover:border-primary/50 hover:text-primary disabled:opacity-50"
              >
                {processing ? <Loader2 size={18} className="animate-spin" /> : <ImagePlus size={18} />}
                <span className="text-[9px] font-bold">{d.addPhotos[lang]}</span>
              </button>
            )}
          </div>

          <input
            ref={addInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => { void addFiles(e.target.files ?? []); e.currentTarget.value = '' }}
          />

          {/* paste external URL */}
          <div className="flex items-center gap-2 pt-1">
            <div className="relative flex-1 min-w-40">
              <Link2 size={13} className="absolute start-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={urlValue}
                onChange={(e) => setUrlValue(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addUrl() } }}
                placeholder={d.orPasteUrl[lang]}
                dir="ltr"
                disabled={disabled || full}
                className="ps-8 h-9 rounded-lg text-xs bg-secondary/50"
              />
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={addUrl}
              disabled={disabled || full || !urlValue.trim()}
              className="h-9 rounded-lg text-xs font-bold"
            >
              {d.addUrl[lang]}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

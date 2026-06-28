'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Pin, ChevronDown, ChevronUp, MessageSquare, Send } from 'lucide-react'
import type { CommunityPost } from '@/lib/db/community'
import type { Nucleus } from '@/types/database'

function ago(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return 'agora'
  const m = Math.floor(s / 60)
  if (m < 60) return `há ${m}min`
  const h = Math.floor(m / 60)
  if (h < 24) return `há ${h}h`
  const d = Math.floor(h / 24)
  if (d < 7) return `há ${d}d`
  return new Date(iso).toLocaleDateString('pt-BR')
}

function initials(name: string | null | undefined): string {
  if (!name) return '?'
  return name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('')
}

interface Props {
  posts: CommunityPost[]
  nuclei: Nucleus[]
  groupId: string
  userId: string
  isLeader: boolean
}

export default function CommunityClient({ posts, nuclei, groupId, userId, isLeader }: Props) {
  const router = useRouter()
  const [, startTransition] = useTransition()

  const [activeTab, setActiveTab] = useState<'all' | string>('all')
  const [expandedPost, setExpandedPost] = useState<string | null>(null)
  const [showNewPost, setShowNewPost] = useState(false)
  const [replyingTo, setReplyingTo] = useState<string | null>(null)

  const [postContent, setPostContent] = useState('')
  const [postNucleusId, setPostNucleusId] = useState<string>('')
  const [replyContent, setReplyContent] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const filteredPosts =
    activeTab === 'all'
      ? posts
      : posts.filter((p) => p.nucleus_id === activeTab)

  async function handleNewPost(e: React.FormEvent) {
    e.preventDefault()
    if (!postContent.trim()) return
    setSubmitting(true)
    setError('')

    const res = await fetch('/api/community/post/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        group_id: groupId,
        content: postContent.trim(),
        nucleus_id: postNucleusId || null,
      }),
    })

    setSubmitting(false)
    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      setError(j.error ?? 'Erro ao publicar')
      return
    }

    setPostContent('')
    setPostNucleusId('')
    setShowNewPost(false)
    startTransition(() => router.refresh())
  }

  async function handleReply(postId: string) {
    if (!replyContent.trim()) return
    setSubmitting(true)
    setError('')

    const res = await fetch('/api/community/reply/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ post_id: postId, content: replyContent.trim() }),
    })

    setSubmitting(false)
    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      setError(j.error ?? 'Erro ao responder')
      return
    }

    setReplyContent('')
    setReplyingTo(null)
    setExpandedPost(postId)
    startTransition(() => router.refresh())
  }

  async function handlePin(postId: string) {
    await fetch('/api/community/post/pin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ post_id: postId }),
    })
    startTransition(() => router.refresh())
  }

  return (
    <div className="space-y-5">
      {/* Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {[{ id: 'all', name: 'Todos' }, ...nuclei.map((n) => ({ id: n.id, name: n.name }))].map(
          (tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-amber-600 text-white'
                  : 'bg-white border border-stone-200 text-stone-600 hover:border-amber-300'
              }`}
            >
              {tab.name}
            </button>
          ),
        )}
      </div>

      {/* New Post Form */}
      {showNewPost ? (
        <form onSubmit={handleNewPost} className="card space-y-3">
          <p className="text-sm font-semibold text-stone-800">Nova publicação</p>
          {nuclei.length > 0 && (
            <select
              className="input"
              value={postNucleusId}
              onChange={(e) => setPostNucleusId(e.target.value)}
            >
              <option value="">Geral (todos os naipes)</option>
              {nuclei.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.name}
                </option>
              ))}
            </select>
          )}
          <textarea
            className="input resize-none"
            rows={4}
            placeholder="Escreva uma mensagem para o grupo…"
            value={postContent}
            onChange={(e) => setPostContent(e.target.value)}
            maxLength={2000}
            autoFocus
          />
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-stone-400">{postContent.length}/2000</span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { setShowNewPost(false); setPostContent(''); setError('') }}
                className="btn-secondary"
              >
                Cancelar
              </button>
              <button type="submit" disabled={submitting || !postContent.trim()} className="btn-primary">
                {submitting ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Publicar
              </button>
            </div>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </form>
      ) : (
        <button
          onClick={() => setShowNewPost(true)}
          className="w-full rounded-xl border border-dashed border-stone-300 bg-white px-4 py-3 text-left text-sm text-stone-400 hover:border-amber-400 hover:text-stone-600 transition-colors"
        >
          + Nova publicação…
        </button>
      )}

      {/* Posts */}
      {filteredPosts.length === 0 ? (
        <div className="card text-center py-12">
          <MessageSquare className="mx-auto h-10 w-10 text-stone-300 mb-3" />
          <p className="text-stone-500 text-sm">Nenhuma publicação ainda.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredPosts.map((post) => {
            const isExpanded = expandedPost === post.id
            const isReplying = replyingTo === post.id
            const authorName = post.profile?.full_name ?? 'Usuário'
            const nucleusName = nuclei.find((n) => n.id === post.nucleus_id)?.name

            return (
              <div
                key={post.id}
                className={`card space-y-3 ${post.is_pinned ? 'border-amber-300 bg-amber-50/40' : ''}`}
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0 h-9 w-9 rounded-full bg-amber-100 flex items-center justify-center">
                      <span className="text-xs font-bold text-amber-700">{initials(authorName)}</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-stone-900">{authorName}</span>
                        {post.is_pinned && (
                          <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                            <Pin className="h-3 w-3" /> Fixado
                          </span>
                        )}
                        {nucleusName && (
                          <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-500">
                            {nucleusName}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-stone-400">{ago(post.created_at)}</span>
                    </div>
                  </div>

                  {isLeader && (
                    <button
                      onClick={() => handlePin(post.id)}
                      title={post.is_pinned ? 'Desfixar' : 'Fixar'}
                      className="flex-shrink-0 text-stone-400 hover:text-amber-600 transition-colors"
                    >
                      <Pin className={`h-4 w-4 ${post.is_pinned ? 'text-amber-600' : ''}`} />
                    </button>
                  )}
                </div>

                {/* Content */}
                <p className="text-sm text-stone-800 whitespace-pre-wrap leading-relaxed">
                  {post.content}
                </p>

                {/* Footer */}
                <div className="flex items-center gap-4 pt-1 border-t border-stone-100">
                  <button
                    onClick={() => setExpandedPost(isExpanded ? null : post.id)}
                    className="flex items-center gap-1.5 text-xs text-stone-500 hover:text-stone-700 transition-colors"
                  >
                    <MessageSquare className="h-3.5 w-3.5" />
                    {post.replies.length} {post.replies.length === 1 ? 'resposta' : 'respostas'}
                    {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                  </button>

                  <button
                    onClick={() => {
                      setReplyingTo(isReplying ? null : post.id)
                      setExpandedPost(post.id)
                      setError('')
                    }}
                    className="text-xs text-amber-600 hover:text-amber-700 font-medium transition-colors"
                  >
                    Responder
                  </button>
                </div>

                {/* Replies */}
                {isExpanded && post.replies.length > 0 && (
                  <div className="space-y-2 pl-4 border-l-2 border-stone-100">
                    {post.replies.map((reply) => (
                      <div key={reply.id} className="flex gap-2">
                        <div className="flex-shrink-0 h-6 w-6 rounded-full bg-stone-100 flex items-center justify-center">
                          <span className="text-[10px] font-bold text-stone-500">
                            {initials(reply.profile?.full_name)}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline gap-2">
                            <span className="text-xs font-semibold text-stone-800">
                              {reply.profile?.full_name ?? 'Usuário'}
                            </span>
                            <span className="text-xs text-stone-400">{ago(reply.created_at)}</span>
                          </div>
                          <p className="text-xs text-stone-700 mt-0.5 whitespace-pre-wrap">{reply.content}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Reply Form */}
                {isReplying && (
                  <div className="flex gap-2 pl-4">
                    <textarea
                      className="input resize-none flex-1 text-sm"
                      rows={2}
                      placeholder="Escreva uma resposta…"
                      value={replyContent}
                      onChange={(e) => setReplyContent(e.target.value)}
                      maxLength={1000}
                      autoFocus
                    />
                    <div className="flex flex-col gap-1">
                      <button
                        onClick={() => handleReply(post.id)}
                        disabled={submitting || !replyContent.trim()}
                        className="btn-primary px-3"
                      >
                        {submitting ? (
                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                      </button>
                      <button
                        onClick={() => { setReplyingTo(null); setReplyContent('') }}
                        className="btn-secondary px-3 text-xs"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                )}

                {error && replyingTo === post.id && (
                  <p className="text-xs text-red-600 pl-4">{error}</p>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages'
const MODEL = 'claude-sonnet-4-6'

async function callClaude(
  systemPrompt: string,
  userMessage: string,
  maxTokens = 1000,
): Promise<string> {
  const res = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    }),
  })

  if (!res.ok) {
    throw new Error(`Anthropic API error: ${res.status}`)
  }

  const json = await res.json()
  return json.content[0].text as string
}

export async function generateTask(params: {
  description: string
  groupContext: string
  repertoireTitle: string
}): Promise<{
  guidance: string
  suggested_scope: string
  suggested_measures: string
  suggested_due_days: number
}> {
  const system = `Você é um assistente de preparação musical para corais e orquestras.
Responda APENAS com JSON válido no formato:
{"guidance":"string","suggested_scope":"string","suggested_measures":"string","suggested_due_days":number}`

  const user = `Contexto do grupo: ${params.groupContext}
Repertório: ${params.repertoireTitle}
Descrição da tarefa: ${params.description}`

  try {
    const text = await callClaude(system, user)
    const start = text.indexOf('{')
    const end = text.lastIndexOf('}')
    if (start === -1 || end === -1) throw new Error('JSON não encontrado')
    return JSON.parse(text.slice(start, end + 1))
  } catch {
    return {
      guidance: params.description,
      suggested_scope: 'grupo',
      suggested_measures: '',
      suggested_due_days: 7,
    }
  }
}

export async function generateReadinessSummary(params: {
  groupName: string
  rehearsalDate: string
  readinessData: { label: string; level: number }[]
}): Promise<string> {
  const system = `Você é um assistente musical que auxilia maestros e líderes de grupos musicais.
Escreva um resumo conciso em português (máximo 200 palavras) sugerindo foco para o ensaio com base nos dados de prontidão.
Lembre sempre que a decisão final é do maestro.`

  const dataText = params.readinessData
    .map((d) => `${d.label}: ${Math.round(d.level * 100)}%`)
    .join('\n')

  const user = `Grupo: ${params.groupName}
Data do ensaio: ${params.rehearsalDate}
Prontidão por item:
${dataText}`

  try {
    return await callClaude(system, user)
  } catch {
    return 'Não foi possível gerar o resumo. A decisão sobre o foco do ensaio fica a critério do maestro.'
  }
}

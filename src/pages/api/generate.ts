import type { APIRoute } from 'astro'
import { createParser, ParsedEvent, ReconnectInterval } from 'eventsource-parser'
import HttpsProxyAgent from 'https-proxy-agent'
import fetch from "node-fetch";

// const apiKey = import.meta.env.OPENAI_API_KEY

export const post: APIRoute = async (context) => {
  const body = await context.request.json()
  const message = body.message
  const apiKey = body.key
  const encoder = new TextEncoder()
  const decoder = new TextDecoder()

  if (!message) {
    return new Response('No input text')
  }
  if (!apiKey) {
    return {
      body: JSON.stringify({
        success: false,
        message: "OpenAI API key is required"
      })
    }
  }

  // @ts-ignore
  const proxyAgent = new HttpsProxyAgent('http://127.0.0.1:8001');
  const options = {
    agent: proxyAgent,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    method: 'POST',
    body: JSON.stringify({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: "user",
          content: message
        }
      ]
      // messages,
      // temperature: 0.6,
      // stream: true,
    }),
  };
  // @ts-ignore
  const completion = await fetch('https://api.openai.com/v1/chat/completions', options)
  // const completion = await fetch('https://api.openai.com/v1/chat/completions', {
  //   headers: {
  //     'Content-Type': 'application/json',
  //     Authorization: `Bearer ${apiKey}`,
  //   },
  //   method: 'POST',
  //   body: JSON.stringify({
  //     model: 'gpt-3.5-turbo',
  //     messages,
  //     temperature: 0.6,
  //     stream: true,
  //   }),
  // })
  console.log(`${completion}`)
  let result = await completion.json()
  if (result?.error) {
    return {
      body: JSON.stringify({
        success: false,
        message: `${result.error?.message}`
      })
    }
  }
  return {
    body: JSON.stringify({
      success: true,
      message: "ok",
      data: result?.choices?.[0].message
    })
  }
  //
  //
  //
  // const stream = new ReadableStream({
  //   async start(controller) {
  //     const streamParser = (event: ParsedEvent | ReconnectInterval) => {
  //       if (event.type === 'event') {
  //         const data = event.data
  //         if (data === '[DONE]') {
  //           controller.close()
  //           return
  //         }
  //         try {
  //           // response = {
  //           //   id: 'chatcmpl-6pULPSegWhFgi0XQ1DtgA3zTa1WR6',
  //           //   object: 'chat.completion.chunk',
  //           //   created: 1677729391,
  //           //   model: 'gpt-3.5-turbo-0301',
  //           //   choices: [
  //           //     { delta: { content: '你' }, index: 0, finish_reason: null }
  //           //   ],
  //           // }
  //           const json = JSON.parse(data)
  //           const text = json.choices[0].delta?.content            
  //           const queue = encoder.encode(text)
  //           controller.enqueue(queue)
  //         } catch (e) {
  //           controller.error(e)
  //         }
  //       }
  //     }
  //
  //     const parser = createParser(streamParser)
  //     for await (const chunk of completion.body as any) {
  //       parser.feed(decoder.decode(chunk))
  //     }
  //   },
  // })
  //
  // return new Response(stream)
}

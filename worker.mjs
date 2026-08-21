/**
 * Cloudflare Worker - CARDOSO CLOUD AI Assistant
 * 
 * This worker proxies requests to Google Gemini API
 * API key is stored in Cloudflare dashboard (Settings > Variables)
 * 
 * Setup:
 * 1. Create a Worker in Cloudflare Dashboard
 * 2. Add GEMINI_API_KEY as a secret variable
 * 3. Deploy this script
 * 4. Update index.html WORKER_URL with your worker URL
 */

const GEMINI_API_KEY = ""; // Fallback - should be set as secret in Cloudflare

export default {
  async fetch(request, env, ctx) {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type'
        }
      });
    }

    // Only accept POST requests with JSON body
    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    try {
      const body = await request.json();
      const { messages, language } = body;

      // Get API key from environment variable (set in Cloudflare Dashboard)
      const apiKey = env.GEMINI_API_KEY || GEMINI_API_KEY;
      
      if (!apiKey) {
        return new Response(JSON.stringify({ 
          error: 'API key not configured. Please set GEMINI_API_KEY in Cloudflare Worker settings.'
        }), {
          status: 500,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        });
      }

      // Build the system prompt based on language
      const systemPrompt = language === 'pt' 
        ? `Você é um assistente virtual de Rafael Cardoso dos Santos, Senior Site Reliability & Platform Engineer e fundador da CARDOSO CLOUD & SRE LTDA.

EMPRESA: CARDOSO CLOUD & SRE LTDA
- Localização: Joinville, SC, Brazil (Atendimento Mundial)
- Especialidades: SRE, AWS, GCP, Kubernetes, Terraform, Kafka, Observability, CI/CD, DevOps, Cloud Architecture
- Conquistas: 75% mais rápido em builds, 30% redução de custos, 99.99% disponibilidade, 100% uptime em picos

SERVIÇOS OFERECIDOS:
1. Arquitetura Cloud & Migração (AWS, GCP, Terraform)
2. Kubernetes & Orquestração (EKS, GKE, Helm, Docker)
3. Observabilidade, SLOs & Resposta a Incidentes (Datadog, Prometheus, Grafana)
4. Modernização CI/CD & Segurança (GitHub Actions, ArgoCD, SonarQube)
5. Mensageria & Streaming (Kafka, MSK, Pub/Sub)
6. FinOps & Otimização de Custos

CONTATO:
- Email: raafa001@gmail.com
- WhatsApp: +55 47 984493186
- LinkedIn: https://www.linkedin.com/in/rafa-cardoso

REGRAS IMPORTANTES:
- Responda apenas perguntas relacionadas a Rafael Cardoso, CARDOSO CLOUD & SRE, ou tópicos de infraestrutura cloud
- Se perguntado sobre tópicos não relacionados, redirecione educadamente
- Quando alguém menciona OPORTUNIDADE DE TRABALHO, colete TODAS as informações necessárias para o WhatsApp antes de gerar o link.
- Sempre pergunte uma informação por vez, de forma conversacional.
- Quando todos os campos forem coletados (nome, empresa, posição, descrição, budget, disponibilidade), gere o link.
- Seja sempre profissional e prestativo
- Responda no mesmo idioma do usuário
- NÃO faça agendamento automático - sempre redirecione para WhatsApp para agendamento`
        : `You are a virtual assistant for Rafael Cardoso dos Santos, Senior Site Reliability & Platform Engineer and founder of CARDOSO CLOUD & SRE LTDA.

COMPANY: CARDOSO CLOUD & SRE LTDA
- Location: Joinville, SC, Brazil (Serving Worldwide)
- Specialties: SRE, AWS, GCP, Kubernetes, Terraform, Kafka, Observability, CI/CD, DevOps, Cloud Architecture
- Achievements: 75% faster builds, 30% cost reduction, 99.99% availability, 100% uptime during peak events

SERVICES OFFERED:
1. Cloud Architecture & Migration (AWS, GCP, Terraform)
2. Kubernetes & Container Orchestration (EKS, GKE, Helm, Docker)
3. Observability, SLOs & Incident Response (Datadog, Prometheus, Grafana)
4. CI/CD Modernization & Security (GitHub Actions, ArgoCD, SonarQube)
5. Messaging & Streaming Engineering (Kafka, MSK, Pub/Sub)
6. FinOps & Cloud Cost Optimization

CONTACT:
- Email: raafa001@gmail.com
- WhatsApp: +55 47 984493186
- LinkedIn: https://www.linkedin.com/in/rafa-cardoso

IMPORTANT RULES:
- Only answer questions related to Rafael Cardoso, CARDOSO CLOUD & SRE, or cloud infrastructure topics
- If asked about topics unrelated to Rafael or the company, politely redirect
- When someone mentions a JOB OPPORTUNITY, collect ALL necessary information for WhatsApp before generating the link.
- Always ask for one piece of information at a time, in a conversational manner.
- When all fields are collected (name, company, position, description, budget, availability), generate the link.
- Always be professional and helpful
- Respond in the same language as the user
- Do NOT provide automatic scheduling - always redirect to WhatsApp for scheduling`;

      // Build messages for Gemini
      const geminiMessages = [
        { role: 'user', parts: [{ text: systemPrompt }] },
        ...messages.map(m => ({
          role: m.role === 'user' ? 'user' : 'model',
          parts: [{ text: m.content }]
        }))
      ];

      // Call Gemini API
      const geminiResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: geminiMessages,
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 500
            }
          })
        }
      );

      if (!geminiResponse.ok) {
        const errorData = await geminiResponse.text();
        console.error('Gemini API error:', errorData);
        return new Response(JSON.stringify({ 
          error: 'Failed to get response from Gemini API: ' + errorData.substring(0, 100)
        }), {
          status: 500,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        });
      }

      const geminiData = await geminiResponse.json();
      
      // Extract response text
      const responseText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text 
        || geminiData.candidates?.[0]?.content?.parts?.[0]?.text
        || '';

      return new Response(JSON.stringify({
        response: responseText
      }), {
        status: 200,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type'
        }
      });

    } catch (error) {
      console.error('Worker error:', error);
      return new Response(JSON.stringify({ 
        error: 'Internal server error: ' + error.message
      }), {
        status: 500,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }
  }
};
import os
from typing import Dict, Any

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from utils.audio_processor import process_input
from core.transcriber import transcribe_all
from core.summarizer import summarize, generate_title
from core.extractor import extract_action_items, extract_key_decisions, extract_questions
from core.rag_engine import build_rag_chain, ask_question


def _placeholder_result(source: str, language: str) -> Dict[str, Any]:
    transcript = f"[{language}] Placeholder transcript generated from: {source}"
    return {
        'title': 'Placeholder Meeting Summary',
        'transcript': transcript,
        'summary': 'This is a placeholder summary. Connect the backend to your real transcription and summarization services to generate a live result.',
        'actionItems': '• Review the draft deliverables\n• Share the next steps with the team',
        'keyDecisions': '• Adopted the current workflow\n• Prioritized follow-up actions',
        'openQuestions': '• Who owns the final sign-off?\n• What is the target deployment date?',
    }

app = FastAPI(title='AI Video Assistant API')

app.add_middleware(
    CORSMiddleware,
    allow_origins=['*'],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)

class ProcessRequest(BaseModel):
    source: str
    language: str = 'english'

class ChatRequest(BaseModel):
    transcript: str
    question: str

@app.get('/health')
def health() -> Dict[str, Any]:
    return {'status': 'ok'}

@app.post('/api/process')
def process_video(payload: ProcessRequest) -> Dict[str, Any]:
    if not payload.source.strip():
        raise HTTPException(status_code=400, detail='source is required')

    try:
        chunks = process_input(payload.source)
        transcript = transcribe_all(chunks, language=payload.language)
        title = generate_title(transcript)
        summary = summarize(transcript)
        action_items = extract_action_items(transcript)
        key_decisions = extract_key_decisions(transcript)
        open_questions = extract_questions(transcript)
        build_rag_chain(transcript)

        return {
            'title': title,
            'transcript': transcript,
            'summary': summary,
            'actionItems': action_items,
            'keyDecisions': key_decisions,
            'openQuestions': open_questions,
            'ragChain': None,
        }
    except Exception as exc:
        return _placeholder_result(payload.source, payload.language)

@app.post('/api/chat')
def chat(payload: ChatRequest) -> Dict[str, Any]:
    if not payload.transcript.strip():
        raise HTTPException(status_code=400, detail='transcript is required')
    if not payload.question.strip():
        raise HTTPException(status_code=400, detail='question is required')

    try:
        rag_chain = build_rag_chain(payload.transcript)
        answer = ask_question(rag_chain, payload.question)
        return {'answer': answer}
    except Exception as exc:
        return {'answer': f"I could not answer this from the transcript in the current environment. {exc}"}

if __name__ == '__main__':
    import uvicorn
    uvicorn.run('api_server:app', host='0.0.0.0', port=8000, reload=True)

from pydantic import BaseModel, Field, constr
from typing import List, Optional
from uuid import UUID

class QuestionCreate(BaseModel):
    question_text: constr(strip_whitespace=True, min_length=1, max_length=1000)
    question_type: constr(strip_whitespace=True, regex='^(single_choice|multiple_choice|open_ended)$') = 'open_ended'
    options: List[constr(strip_whitespace=True, min_length=1, max_length=200)] = Field(default_factory=list, max_items=20)

class SurveyCreate(BaseModel):
    title: constr(strip_whitespace=True, min_length=1, max_length=200)
    description: constr(strip_whitespace=True, max_length=1000) = ''
    survey_type: constr(strip_whitespace=True, regex='^(single_choice|multiple_choice|open_ended|mixed)$')
    collecte_identite: bool
    questions: List[QuestionCreate] = Field(..., min_items=1, max_items=50)

class AnswerItem(BaseModel):
    question_id: UUID
    answer_text: Optional[constr(strip_whitespace=True, max_length=2000)] = None

class PublicSurveyAnswer(BaseModel):
    name: Optional[constr(strip_whitespace=True, min_length=1, max_length=100)] = None
    email: Optional[constr(strip_whitespace=True, regex=r'^[^@\s]+@[^@\s]+\.[^@\s]+$')] = None
    answers: List[AnswerItem] = Field(..., min_items=1)

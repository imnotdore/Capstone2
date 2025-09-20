import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import api from "../lib/api";

export default function ExamForm() {
  const { examId } = useParams();
  const [questions, setQuestions] = useState([]);

  useEffect(() => {
    const fetchQuestions = async () => {
      const token = localStorage.getItem("token");
      const res = await api.get(`/exams/${examId}/questions`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setQuestions(res.data);
    };
    fetchQuestions();
  }, [examId]);

  return (
    <div className="exam-form">
      <h2>📝 Exam</h2>
      {questions.length === 0 ? (
        <p>No questions available.</p>
      ) : (
        questions.map((q, i) => (
          <div key={i} className="question">
            <p><b>{i + 1}. {q.question}</b></p>
            {q.type === "mcq" &&
              q.options.map((opt, j) => (
                <label key={j}>
                  <input type="radio" name={`q${i}`} value={opt} /> {opt}
                </label>
              ))
            }
            {q.type === "essay" &&
              <textarea placeholder="Your answer here..." />
            }
            {q.type === "truefalse" &&
              <>
                <label><input type="radio" name={`q${i}`} value="true" /> True</label>
                <label><input type="radio" name={`q${i}`} value="false" /> False</label>
              </>
            }
          </div>
        ))
      )}
    </div>
  );
}

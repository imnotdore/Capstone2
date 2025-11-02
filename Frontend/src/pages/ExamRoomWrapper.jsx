import { useParams } from "react-router-dom";
import ExamRoom from "./ExamRoom";

export default function ExamRoomWrapper() {
  const { roomId } = useParams();
  return <ExamRoom roomId={roomId} />;
}

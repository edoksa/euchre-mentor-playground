
import { GameProvider } from "@/context/GameContext";
import EuchreGame from "@/components/EuchreGame";

const Index = () => {
  return (
    <GameProvider>
      <EuchreGame />
    </GameProvider>
  );
};

export default Index;

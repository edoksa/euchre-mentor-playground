
import { GameProvider } from "@/context/GameContext";
import EuchreGame from "@/components/EuchreGame";

const Index = () => {
  return (
    <GameProvider>
      <div className="min-h-screen">
        <EuchreGame />
      </div>
    </GameProvider>
  );
};

export default Index;

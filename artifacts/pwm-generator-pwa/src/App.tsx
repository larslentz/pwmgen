import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import PWMGenerator from "@/pages/PWMGenerator";

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <PWMGenerator />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;

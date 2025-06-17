// Define a type for any context you might want to pass in the future.
// For now, it's empty, but you can add things like user data, code snippets, etc.
interface PromptContext {
  // Example: codeToInject?: string;
  // Example: userData?: { name: string; plan: 'pro' | 'free' };
}

// The main function that generates the system prompt.
// It returns a string that will be used as the system message.
export function getSystemPrompt(modelId: string, context: PromptContext = {}): string {
  
  // --- Example of Dynamic Injection ---
  // You could have a base prompt and inject dynamic parts into it.
  const baseUIPrompt = `/no_think You are a world-class UI/UX designer and frontend developer AI. 
  Your goal is to generate clean, modern, and production-ready code for web interfaces based on user descriptions.
  You must only respond with code. Do not add any conversational text or explanations.
  Your output should be a single, complete code block ready for direct use. /no_think`;

  // --- Model-Specific Logic ---
  // Use a switch statement or if/else chain to handle different models.
  // This is where you can build your dynamic prompts.
  switch (modelId) {
    case 'tesslate-uigen-t3-14b-preview':
      // You could add dynamic logic here, for example:
      // if (context.codeToInject) {
      //   return `${baseUIPrompt}\n\nHere is some existing code for context:\n\`\`\`\n${context.codeToInject}\n\`\`\``;
      // }
      return baseUIPrompt;

    case 'tesslate-tessa-rust-t1-7b':
      return "You are Tessa-Rust, an expert Rust programming assistant. Your goal is to provide accurate, efficient, and idiomatic Rust code. Explain your code with comments when necessary, but prioritize correctness and performance.";

    case 'groq-llama-3.1-8b-instant':
      return "You are a helpful, concise, and fast general-purpose assistant powered by Groq. Prioritize clarity and speed in your responses.";
    
    // Add more cases for other models as needed...

    default:
      // A sensible default for any model without a specific prompt.
      return "You are a helpful AI assistant. Respond clearly and concisely.";
  }
}
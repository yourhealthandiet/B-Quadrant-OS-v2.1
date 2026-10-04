import { AppData, Investment, Goal, InsightContext } from "../types";
import { generateInsight, generateESBIAdvice, generateLearning, generateAdvisorResponse } from "./insightEngine";

// --- Dynamic Insight Engine Wrappers ---

export const generateDynamicTip = async (data: AppData, metrics: any, activeProfileId: string, timeFilter: string, ctx?: InsightContext): Promise<string> => {
    if (ctx) {
        const insight = generateInsight(ctx);
        return `${insight.insight} Advice: ${insight.action}`;
    }
    return "Keep logging your financial data to unlock localized intelligence.";
};

export const classifyEntryQuadrant = async (
  description: string, 
  amount: number,
  hoursWorked: number,
  profileContext: any 
): Promise<'E' | 'S' | 'B' | 'I'> => {
  // Simple heuristic based on Rich Dad Principles
  if (hoursWorked >= 30) return 'E';
  if (hoursWorked > 0 && hoursWorked < 30) return 'S';
  
  const desc = description.toLowerCase();
  if (desc.includes('dividend') || desc.includes('interest') || desc.includes('rent')) return 'I';
  if (desc.includes('business') || desc.includes('distribution')) return 'B';
  if (desc.includes('salary') || desc.includes('wage')) return 'E';
  
  return 'S'; 
};

export const getSmartAdvisorResponse = (ctx: InsightContext, query: string): string => {
    return generateAdvisorResponse(ctx, query);
};

export const chatWithAdvisor = async (message: string, contextData: string, ctx?: InsightContext): Promise<string> => {
    if (ctx) {
        return generateAdvisorResponse(ctx, message);
    }
    
    // Fallback if context is not passed
    const msg = message.toLowerCase();
    if (msg.includes('debt')) return "Rich Dad says: There is Good Debt (pays for assets) and Bad Debt (pays for liabilities). Which one do you have?";
    if (msg.includes('audit')) return "Based on your data, your Freedom Ratio is the priority. Increase Passive Income or reduce Expenses.";
    return "I am analyzing your financial data. To escape the Rat Race, focus on acquiring Assets that produce Cashflow.";
};

export const getPersonalizedLesson = async (data: AppData, metrics: any, activeProfileId: string, ctx?: InsightContext): Promise<string> => {
    if (ctx) {
        const lesson = generateLearning(ctx);
        return `${lesson.title}\n\n${lesson.insight}\n\nACTION: ${lesson.action}`;
    }
    return "System calibrating. Please keep logging your financial data to unlock your personalized mentorship.";
};

export const analyzePortfolio = async (investments: Investment[], currency: string): Promise<string> => {
    return "Portfolio analyzer initializing. Focus on shifting from E-quadrant income to I-quadrant assets.";
};

export const getGoalStrategy = async (goal: Goal, currency: string): Promise<string> => {
    return `Strategy for ${goal.title}: Monitor your passive coverage. You need more assets in the I-quadrant to fund this goal without trading time.`;
};

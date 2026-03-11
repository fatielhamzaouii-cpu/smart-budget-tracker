interface InsightData {
  currentMonthExpenses: number;
  lastMonthExpenses: number;
  currentMonthIncome: number;
  lastMonthIncome: number;
  totalSavings: number;
  totalDebts: number;
  categorySpending: { name: string; current: number; previous: number }[];
  savingsRate: number;
  lastSavingsRate: number;
}

export interface Insight {
  message: string;
  type: 'positive' | 'negative' | 'neutral';
  icon: string;
}

export function generateInsights(data: InsightData): Insight[] {
  const insights: Insight[] = [];

  // Overall spending trend
  if (data.lastMonthExpenses > 0) {
    const expenseChange = ((data.currentMonthExpenses - data.lastMonthExpenses) / data.lastMonthExpenses) * 100;
    if (expenseChange > 10) {
      insights.push({
        message: `Your spending increased by ${Math.round(expenseChange)}% compared to last month. Consider reviewing your expenses.`,
        type: 'negative',
        icon: 'trending-up',
      });
    } else if (expenseChange < -10) {
      insights.push({
        message: `Great job! You reduced spending by ${Math.round(Math.abs(expenseChange))}% compared to last month.`,
        type: 'positive',
        icon: 'trending-down',
      });
    } else {
      insights.push({
        message: `Your spending is relatively stable compared to last month (${expenseChange > 0 ? '+' : ''}${Math.round(expenseChange)}%).`,
        type: 'neutral',
        icon: 'minus',
      });
    }
  }

  // Income trend
  if (data.lastMonthIncome > 0) {
    const incomeChange = ((data.currentMonthIncome - data.lastMonthIncome) / data.lastMonthIncome) * 100;
    if (incomeChange > 0) {
      insights.push({
        message: `Your income grew by ${Math.round(incomeChange)}% this month. Keep up the momentum!`,
        type: 'positive',
        icon: 'dollar',
      });
    } else if (incomeChange < -10) {
      insights.push({
        message: `Your income dropped by ${Math.round(Math.abs(incomeChange))}% this month. Consider diversifying income sources.`,
        type: 'negative',
        icon: 'alert',
      });
    }
  }

  // Savings rate
  if (data.currentMonthIncome > 0) {
    const savingsRate = ((data.currentMonthIncome - data.currentMonthExpenses) / data.currentMonthIncome) * 100;
    if (savingsRate > 20) {
      insights.push({
        message: `Excellent savings rate of ${Math.round(savingsRate)}%! You're building a strong financial cushion.`,
        type: 'positive',
        icon: 'piggy-bank',
      });
    } else if (savingsRate > 0) {
      insights.push({
        message: `Your savings rate is ${Math.round(savingsRate)}%. Aim for at least 20% for long-term financial health.`,
        type: 'neutral',
        icon: 'target',
      });
    } else {
      insights.push({
        message: `You're spending more than you earn this month. Review your expenses to find savings opportunities.`,
        type: 'negative',
        icon: 'alert-triangle',
      });
    }
  }

  // Savings rate improvement
  if (data.lastSavingsRate > 0 && data.savingsRate > data.lastSavingsRate) {
    insights.push({
      message: `Your savings rate improved compared to last month. Great progress!`,
      type: 'positive',
      icon: 'award',
    });
  }

  // Category-specific insights
  data.categorySpending.forEach(cat => {
    if (cat.previous > 0) {
      const change = ((cat.current - cat.previous) / cat.previous) * 100;
      if (change > 25) {
        insights.push({
          message: `You spent ${Math.round(change)}% more on ${cat.name} this month compared to last month.`,
          type: 'negative',
          icon: 'category',
        });
      } else if (change < -25) {
        insights.push({
          message: `You reduced ${cat.name} spending by ${Math.round(Math.abs(change))}%. Well done!`,
          type: 'positive',
          icon: 'thumbs-up',
        });
      }
    }
  });

  // Debt-to-income ratio
  if (data.currentMonthIncome > 0 && data.totalDebts > 0) {
    const debtRatio = (data.totalDebts / (data.currentMonthIncome * 12)) * 100;
    if (debtRatio > 50) {
      insights.push({
        message: `Your debt-to-annual-income ratio is ${Math.round(debtRatio)}%. Consider a debt repayment strategy.`,
        type: 'negative',
        icon: 'alert',
      });
    }
  }

  // If no income/expenses yet
  if (data.currentMonthIncome === 0 && data.currentMonthExpenses === 0) {
    insights.push({
      message: `Start adding your income and expenses to receive personalized financial insights.`,
      type: 'neutral',
      icon: 'info',
    });
  }

  return insights.slice(0, 6);
}

export const downloadMasterManual = (userName: string) => {
    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>B-Quadrant OS: Master Guide</title>
    <style>
        body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 40px; }
        h1 { color: #1a365d; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; }
        h2 { color: #2d3748; margin-top: 30px; }
        h3 { color: #4a5568; }
        .highlight { background: #ebf8ff; padding: 15px; border-left: 4px solid #3182ce; margin: 20px 0; }
        .quadrant { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 20px 0; }
        .q-box { padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; }
        .q-e { background: #fff5f5; border-left: 4px solid #e53e3e; }
        .q-s { background: #fffff0; border-left: 4px solid #d69e2e; }
        .q-b { background: #f0fff4; border-left: 4px solid #38a169; }
        .q-i { background: #ebf4ff; border-left: 4px solid #3182ce; }
        .faq { margin-top: 40px; border-top: 2px solid #e2e8f0; padding-top: 20px; }
        .faq-item { margin-bottom: 20px; }
        .faq-q { font-weight: bold; color: #2d3748; }
        .faq-a { color: #4a5568; }
        .footer { margin-top: 50px; text-align: center; color: #a0aec0; font-size: 0.9em; }
    </style>
</head>
<body>
    <h1>B-Quadrant OS: The Master Guide</h1>
    <p>Prepared for: <strong>${userName}</strong></p>
    
    <div class="highlight">
        <strong>The Core Philosophy:</strong> Moving from the left side of the quadrant (working for money) to the right side of the quadrant (money working for you). To fully grasp this, we highly recommend reading <em>Rich Dad Poor Dad</em> by Robert Kiyosaki.
    </div>

    <h2>The Cashflow Quadrant Explained</h2>
    <div class="quadrant">
        <div class="q-box q-e">
            <h3>E - Employee</h3>
            <p><strong>You have a job.</strong> You trade your time for money. If you don't work, you don't get paid. Security is your primary focus, but you have little control.</p>
        </div>
        <div class="q-box q-s">
            <h3>S - Self-Employed</h3>
            <p><strong>You own a job.</strong> You are the system. If you take a 6-month vacation, your business stops. Many think they are business owners, but they are actually 'S'.</p>
        </div>
        <div class="q-box q-b">
            <h3>B - Business Owner</h3>
            <p><strong>You own a system.</strong> People work for you. You can leave for a year and the business will be more profitable when you return. Wealth is generated through leverage.</p>
        </div>
        <div class="q-box q-i">
            <h3>I - Investor</h3>
            <p><strong>Money works for you.</strong> The surplus cash generated from your 'B' quadrant businesses is deployed into assets that yield passive income. This is true financial freedom.</p>
        </div>
    </div>

    <h2>How B-Quadrant OS Gets You There</h2>
    <p>This software is not a standard budgeting app. It is a wealth-building engine. It does three core things:</p>
    <ol>
        <li><strong>Structural Visibility:</strong> It separates your personal identity from your corporate entities to protect your assets.</li>
        <li><strong>Automated Income Splitting (The Bucket System):</strong> It forces disciplined capital allocation. When cash enters, it is strictly divided into OPEX, Taxes, and Profit BEFORE you ever see it.</li>
        <li><strong>The Freedom Ratio:</strong> It calculates exactly when your passive income exceeds your living expenses. When this ratio hits 100%, you are mathematically free.</li>
    </ol>

    <div class="faq">
        <h2>Frequently Asked Questions (FAQ)</h2>
        
        <div class="faq-item">
            <div class="faq-q">Q: I run a business, isn't that the "B" quadrant?</div>
            <div class="faq-a">A: Not necessarily. If your business requires your daily presence to survive, you are in the "S" (Self-Employed) quadrant. A true "B" quadrant business operates on systems and high-level management, independent of your immediate labor.</div>
        </div>

        <div class="faq-item">
            <div class="faq-q">Q: What is the "Endless Hierarchy" bucket system?</div>
            <div class="faq-a">A: Instead of mixing all income into one pile, the OS routes cash into predefined buckets. A bucket can have sub-buckets. E.g., Revenue -&gt; 30% OPEX -&gt; 50% Payroll. It ensures your business runs predictably and protects you from overspending.</div>
        </div>

        <div class="faq-item">
            <div class="faq-q">Q: Why do I have a Personal Profile and Business Profiles?</div>
            <div class="faq-a">A: The rich do not own things directly; they control them through entities. Your personal profile manages your living expenses and direct assets. Your business profiles act as wealth-generating engines that you control. This OS mirrors real-world corporate structuring.</div>
        </div>
        
        <div class="faq-item">
            <div class="faq-q">Q: How do I hit 100% Financial Freedom?</div>
            <div class="faq-a">A: Build your business ("B") to generate surplus Profit. Distribute that Profit to your Personal ("E/I") Profile. Invest that cash into Assets that yield dividends or rent. When those yields pay for your Personal Living Expenses, you hit 100% Freedom.</div>
        </div>
    </div>

    <div class="footer">
        Generated by B-Quadrant OS • Financial Freedom System
    </div>
</body>
</html>
    `;

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'B-Quadrant-OS-Master-Guide.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};

const { postUpdate } = require('./x_client');

(async () => {
    console.log("Testing X (Twitter) integration...");
    const success = await postUpdate("Hello World. TopClaw Agent is online. #TopClaw #AI");
    if (success) {
        console.log("✅ Success! Tweet posted.");
    } else {
        console.log("❌ Failed. Check your credentials in x-credentials.json.");
    }
})();

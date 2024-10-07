import { Account } from "@namada/types";
import { PullRequest } from "@prb0t/pr";
import { Bond } from "./genesis";

// Helper function to generate TOML content from Bond objects
export const generateTomlContent = (bonds: Bond[]): string => {
  let tomlContent = "";
  bonds.forEach((bond) => {
    tomlContent += `[[bond]]\n`;
    tomlContent += `source = "${bond.source}"\n`;
    tomlContent += `validator = "${bond.validator}"\n`;
    tomlContent += `amount = "${bond.amount.toString()}"\n\n`;
    tomlContent += `[bond.signatures]\n`;
    bond.signatures.forEach((signature) => {
      tomlContent += `${signature.pub_key} = "${signature.signature}"\n`;
    });
    tomlContent += `\n`;
  });
  return tomlContent;
};

// Function to create and send the PR using PRB0t's NPM package
export const submitToPRBot = async (
  account: Account,
  bonds: Bond[]
): Promise<string | null> => {
  try {
    // Step 1: Dynamically determine the filename and branch name
    const fileName = `${account.alias}-bond.toml`.toLowerCase(); // Ensure filename is lowercase
    const branchName = `${account.alias}:patch-1`.toLowerCase();
    const commitMessage = `Add ${fileName}`;
    const prTitle = `Add ${fileName}`;

    // Step 2: Generate TOML content programmatically
    const tomlContent = generateTomlContent(bonds);

    // Step 3: Base64 encode the TOML content (GitHub requires Base64 encoded content)
    const base64Content = Buffer.from(tomlContent).toString("base64");

    // Step 4: Initialize PRB0t's PR object
    const pr = PullRequest(
      "anoma", // Replace with the repo owner (e.g., 'anoma')
      "namada-mainnet-genesis", // Replace with the repo name
      branchName, // The branch you want to create for the PR
      "" // PRB0t does not require a token in this context
    );

    // Step 5: Configure the PR details
    pr.configure(
      [{ path: `transactions/${fileName}`, content: base64Content }], // File path and content
      commitMessage, // Commit message
      prTitle, // PR title
      "", // PR description
      [
        {
          name: "PRB0t", // Author name
          email: "34620110+PRB0t@users.noreply.github.com", // Author email
        },
      ]
    );

    // Step 6: Send the PR request
    const data = await pr.send();

    // Step 7: Return the PR creation result
    if (data && data.url) {
      return data.url;
    } else {
      throw new Error("PR creation failed: No URL returned from PRB0t.");
    }
  } catch (error: any) {
    console.error("Error creating pull request:", error.message || error);
    return null;
  }
};

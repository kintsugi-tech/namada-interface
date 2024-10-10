import axios from "axios";
import BigNumber from "bignumber.js";
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

const getRandomLetters = (): string => {
  const letters = "abcdefghijklmnopqrstuvwxyz";
  let result = "";

  for (let i = 0; i < 4; i++) {
    result += letters.charAt(Math.floor(Math.random() * letters.length));
  }

  return result;
};

export const submitToPRBot = async (
  bonds: Bond[],
  discordHandle: string
): Promise<string | null> => {
  try {
    // Step 1: Dynamically determine the filename and branch name
    const fileName = `${discordHandle.replace(/[@#]/g, "").toLowerCase() ?? `anon-${getRandomLetters()}`}-bond.toml`;
    const branchName = `patch-1`;
    const commitMessage = `Add ${fileName}`;
    const prTitle = `Add ${fileName}`;

    // Step 2: Generate TOML content programmatically
    const tomlContent = generateTomlContent(bonds);

    // Step 3: Base64 encode the TOML content
    const base64Content = Buffer.from(tomlContent).toString("base64");

    // Step 4: Prepare the request payload
    const payload = {
      owner: "ValidityOps",
      repo: "namada-mainnet-genesis",
      title: prTitle,
      commit: commitMessage,
      branch: branchName,
      discordHandle: discordHandle ?? "",
      files: [{ path: `transactions/${fileName}`, content: base64Content }],
    };

    // Step 5: Send the POST request to your API route
    const response = await axios.post(
      "https://namada-bond-api.metasig.workers.dev/",
      payload,
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    // Step 6: Return the PR URL (assuming the API returns it in the response)
    if (response) {
      console.log(response, response?.data, "RESPONSEEEE");
      return response.data;
    } else {
      throw new Error("PR creation failed: No URL returned from API.");
    }
  } catch (error: any) {
    console.error("Error creating pull request:", error.message || error);
    return null;
  }
};

export const prBotTest = async (): Promise<void> => {
  const dummyBonds: Bond[] = [
    {
      source: "0x2234567890123456789012345678901234567890",
      validator: "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
      amount: new BigNumber("1000000000000000000"), // 1 ETH
      signatures: [
        {
          pub_key:
            "0x02a1633cafcc01ebfb6d78e39f687a1f0995c62fc95f51ead10a02ee0be551b5dc",
          signature:
            "0x1b66ac1fb663c9bc59509846d6ec05345bd908eda73e670af888da41af171505c6a474fd03ec7d5542e2ae9c3b508e0a14946352c30384523e3923c0c59137",
        },
        {
          pub_key:
            "0x03fdd57adec3d438ea237fe46b33ee1e016eda6b585c3e27ea66686c2ea5358479",
          signature:
            "0x1c9efde8d13acca85d692876adb9c8e6b5ca408315f4bb82e13aee1bf4e8ffe9c78ad5b4e5e02dbc01f3f16aaa04a6b3fcd1f0e3581802d61e83e5ffa72987",
        },
      ],
    },
    {
      source: "0x2345678901234567890123456789012345678901",
      validator: "0xbcdefabcdefabcdefabcdefabcdefabcdefabcde",
      amount: new BigNumber("500000000000000000"), // 0.5 ETH
      signatures: [
        {
          pub_key:
            "0x026e0d6a9f0f9eca9f5c0fb1262f1a5f69b23e56d7fb1a61c46af6ec03d9b1c8d8",
          signature:
            "0x1c22b97b77e5a93e9e2c9aca2c2f7d995a6f78f6ae3c4a8cfe6885bfa86342b23d8d975481c2e0aa91e6a5e2c6a66f4c1eedce2edb89f1adcf6e579e1f463e",
        },
      ],
    },
  ];
  await submitToPRBot(dummyBonds, "test#1234");
};

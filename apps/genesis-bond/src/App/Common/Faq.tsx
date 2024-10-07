import { Text } from "@namada/components";
import React from "react";
import { FaqContainer, FaqUrl } from "./Faq.components";
import { FaqDropdown } from "./FaqDropdown";
const namadaDiscord = "https://discord.com/invite/namada";

export const Faq: React.FC = () => {
  return (
    <FaqContainer>
      <Text className="text-black text-5xl my-0">FAQs</Text>
      <FaqDropdown title="I get wrong chain id error. What should I do?">
        <Text className="text-black my-0">
          Make sure to have set the correct chain id in the Namada Extension.{" "}
          <br /> <br />
          {`You can set it by opening the extension clicking its icon in the top
          bar of your browser, then click the gear settings icon. Select
          "Network", type "namada-genesis" and press "Submit".`}{" "}
          <br />
          <br /> Here a{" "}
          <a href="/chain-setting.gif" className="underline" target="_blank">
            small video
          </a>{" "}
          on how to do that.{" "}
        </Text>
      </FaqDropdown>
      <FaqDropdown title="How do I use this?">
        <Text className="text-black my-0">
          This interface allows you to easily sing a pre-bond transaction for
          Namada genesis block. <br /> <br /> Simply connect Namada Extension
          and set chain-id to {`"namada-gensis".`} choose the desired wallet,
          validator and amount, and click the Sign button.
        </Text>
      </FaqDropdown>
      <FaqDropdown title="How Automatic submission works?">
        <Text className="text-black my-0">
          If you enable Automatic Submission, your bonds will be automatically
          pushed to the official Namada github.
        </Text>
      </FaqDropdown>
      <FaqDropdown title="What happens if I submit multiple automatic bonds?">
        <Text className="text-black my-0">
          Only the last submitted bond will be inclued in the genesis. Bonds
          submitted before will not be included in the automatic generated pull
          request.
        </Text>
      </FaqDropdown>
      <FaqDropdown title="What happens if I submit both an automatic bond here and a regular one on GitHub?">
        <Text className="text-black my-0">
          In case the same delegator address submits both an automatic bond
          through ValidityOps and a regular pull request to the official Namada
          GitHub repository, the automatic bond will be ignored and not included
          in the genesis block.
        </Text>
      </FaqDropdown>
      <FaqDropdown title="Is it safe to share the signed bond transactions?">
        <Text className="text-black my-0">
          The signed bond transaction is valid only during the genesis event. It
          cannot be submitted after chain launch, therefore they are useless
          after genesis.
        </Text>
      </FaqDropdown>
      <FaqDropdown title="Where can i get support?">
        <Text className="text-black my-0">
          <FaqUrl href={namadaDiscord}>{"Join Namada Discord"}</FaqUrl> to share
          any issues or questions you have relating to this interface.
        </Text>
      </FaqDropdown>
    </FaqContainer>
  );
};

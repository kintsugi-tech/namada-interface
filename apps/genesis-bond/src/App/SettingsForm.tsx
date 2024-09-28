import { ActionButton, Input } from "@namada/components";
import { AppContext } from "App/App";
import React, { useContext, useState } from "react";
import {
  ButtonContainer,
  InputContainer,
  SettingsContainer,
  SettingsFormContainer,
} from "./App.components";

export const SettingsForm: React.FC = () => {
  const [isFormValid, setIsFormValid] = useState(false);
  const { setIsModalOpen } = useContext(AppContext)!;

  const handleSetUrl = (url: string): void => {
    // Strip endpoint from URL if it was provided
    setIsModalOpen(false);
  };

  return (
    <SettingsContainer>
      <SettingsFormContainer>
        <InputContainer>
          <Input
            label="Set Faucet API URL"
            value={""}
            onChange={(e) => {}}
            autoFocus={true}
          />
        </InputContainer>
        <ButtonContainer>
          <ActionButton
            onClick={() => handleSetUrl("")}
            disabled={!isFormValid}
          >
            Update URL
          </ActionButton>
        </ButtonContainer>
      </SettingsFormContainer>
    </SettingsContainer>
  );
};

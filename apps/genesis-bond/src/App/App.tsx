import React, { createContext, useCallback, useEffect, useState } from "react";
import { GoGear } from "react-icons/go";
import { ThemeProvider } from "styled-components";

import { ActionButton, Alert, Modal } from "@namada/components";
import { Namada } from "@namada/integrations";
import { ColorMode, getTheme } from "@namada/utils";
import {
  AppContainer,
  BackgroundImage,
  BottomSection,
  ContentContainer,
  FaucetContainer,
  GlobalStyles,
  InfoContainer,
  SettingsButton,
  SettingsButtonContainer,
  TopSection,
} from "App/App.components";

import { chains } from "@namada/chains";
import { useUntil } from "@namada/hooks";
import { Account } from "@namada/types";
import { loadValidators } from "utils";
import dotsBackground from "../../public/bg-dots.svg";
import { AppHeader, CallToActionCard, CardsContainer, Faq } from "./Common";
import { GenesisBondForm } from "./Genesis";
import { SettingsForm } from "./SettingsForm";

type AppContext = {
  setIsModalOpen: (value: boolean) => void;
  integration: Namada;
};

export const AppContext = createContext<AppContext | null>(null);

enum ExtensionAttachStatus {
  PendingDetection,
  NotInstalled,
  Installed,
}

export const App: React.FC = () => {
  const initialColorMode = "dark";
  const chain = chains.namada;
  const integration = new Namada(chain);
  const [extensionAttachStatus, setExtensionAttachStatus] = useState(
    ExtensionAttachStatus.PendingDetection
  );
  const [isExtensionConnected, setIsExtensionConnected] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [colorMode, _] = useState<ColorMode>(initialColorMode);
  const [validators, setValidators] = useState<
    { label: string; value: string }[]
  >([]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [settingsError, setSettingsError] = useState<string>();
  const theme = getTheme(colorMode);

  useUntil(
    {
      predFn: async () => Promise.resolve(integration.detect()),
      onSuccess: () => {
        setExtensionAttachStatus(ExtensionAttachStatus.Installed);
      },
      onFail: () => {
        setExtensionAttachStatus(ExtensionAttachStatus.NotInstalled);
      },
    },
    { tries: 5, ms: 300 },
    [integration]
  );

  const handleConnectExtensionClick = useCallback(async (): Promise<void> => {
    if (integration) {
      try {
        const isIntegrationDetected = integration.detect();

        if (!isIntegrationDetected) {
          throw new Error("Extension not installed!");
        }

        await integration.connect();
        const accounts = await integration.accounts();
        if (accounts) {
          setAccounts(accounts.filter((account) => !account.isShielded));
        }
        setIsExtensionConnected(true);
      } catch (e) {
        console.error(e);
      }
    }
  }, [integration]);

  useEffect(() => {
    const loadVals = async () => {
      try {
        const vals = await loadValidators();
        setValidators(vals);
      } catch (e) {
        console.error(e);
      }
    };

    loadVals();
  }, []);

  return (
    <AppContext.Provider
      value={{
        setIsModalOpen,
        integration,
      }}
    >
      <ThemeProvider theme={theme}>
        <GlobalStyles colorMode={colorMode} />
        <BackgroundImage imageUrl={dotsBackground} />
        <AppContainer>
          <ContentContainer>
            <SettingsButtonContainer>
              <SettingsButton
                onClick={() => setIsModalOpen(true)}
                title="Settings"
              >
                <GoGear />
              </SettingsButton>
            </SettingsButtonContainer>

            <TopSection>
              <AppHeader />
            </TopSection>
            <FaucetContainer>
              {settingsError && (
                <InfoContainer>
                  <Alert type="error">{settingsError}</Alert>
                </InfoContainer>
              )}

              {extensionAttachStatus ===
                ExtensionAttachStatus.PendingDetection && (
                <InfoContainer>
                  <Alert type="info">Detecting extension...</Alert>
                </InfoContainer>
              )}
              {extensionAttachStatus === ExtensionAttachStatus.NotInstalled && (
                <InfoContainer>
                  <Alert type="error">
                    You must have the{" "}
                    <a
                      href="https://namada.net/extension"
                      className="underline font-bold"
                      target="_blank"
                    >
                      Namada Extension
                    </a>{" "}
                    installed!
                  </Alert>
                </InfoContainer>
              )}

              {isExtensionConnected && validators.length > 0 && (
                <GenesisBondForm accounts={accounts} validators={validators} />
              )}

              {isExtensionConnected && validators.length <= 0 && (
                <InfoContainer>
                  <Alert type="error">
                    Failed to load validators from API. Try again later.
                  </Alert>
                </InfoContainer>
              )}
              {extensionAttachStatus === ExtensionAttachStatus.Installed &&
                !isExtensionConnected && (
                  <InfoContainer>
                    <ActionButton onClick={handleConnectExtensionClick}>
                      Connect to Namada Extension
                    </ActionButton>
                  </InfoContainer>
                )}
            </FaucetContainer>
            {isModalOpen && (
              <Modal onClose={() => setIsModalOpen(false)}>
                <SettingsForm />
              </Modal>
            )}
            <BottomSection>
              <CardsContainer>
                <CallToActionCard
                  description="Contribute to the Namada network's resiliency"
                  title="RUN A FULL NODE"
                  href={""}
                />
                <CallToActionCard
                  description="Integrate Namada into applications or extend its capabilities"
                  title="BECOME A BUILDER"
                  href={""}
                />
              </CardsContainer>
              <Faq />
            </BottomSection>
          </ContentContainer>
        </AppContainer>
      </ThemeProvider>
    </AppContext.Provider>
  );
};

import EmailIcon from "@mui/icons-material/Email";
import LanguageIcon from "@mui/icons-material/Language";
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
} from "@mui/material";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import { chains } from "@namada/chains";
import { ActionButton, Alert, Modal } from "@namada/components";
import { useUntil } from "@namada/hooks";
import { Namada } from "@namada/integrations";
import { Account } from "@namada/types";
import { ColorMode, getTheme, shortenAddress } from "@namada/utils";
import {
  AppContainer,
  BackgroundImage,
  BottomSection,
  ContentContainer,
  FaucetContainer,
  GlobalStyles,
  InfoContainer,
  TopSection,
} from "App/App.components";
import React, { createContext, useCallback, useEffect, useState } from "react";
import { FaDiscord } from "react-icons/fa";
import { ThemeProvider } from "styled-components";
import dotsBackground from "../../public/bg-dots.svg";
import { AppHeader, CallToActionCard, CardsContainer, Faq } from "./Common";
import { GenesisBondForm } from "./Genesis";
import { SettingsForm } from "./SettingsForm";
import { DataRow, ValidatorData } from "./types";
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
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedValidator, setSelectedValidator] = useState<{
    address: string;
    alias: string;
  } | null>(null);
  const [rows, setRows] = useState<DataRow[]>([]);
  const [isExtensionConnected, setIsExtensionConnected] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [colorMode, _] = useState<ColorMode>(initialColorMode);
  const [validators, setValidators] = useState<
    { label: string; value: string }[]
  >([]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [settingsError, setSettingsError] = useState<string>();
  const theme = getTheme(colorMode);

  useEffect(() => {
    const fetchData = async (): Promise<void> => {
      try {
        const res = await fetch(
          "https://validityops.github.io/namada-bond/validators_data.json"
        );
        if (!res.ok) {
          throw new Error("Failed to fetch data");
        }
        const data: ValidatorData[] = await res.json();
        const mappedRows = data.map(
          (validator: ValidatorData, index: number) => {
            const commissionRate = parseFloat(validator.commission);
            const totalBond = validator.total_bond;
            const totalVotingPower = validator.total_voting_power;
            const row: DataRow = {
              id: index,
              alias: validator.alias ?? "Alias Unknown",
              address: validator.address,
              commission: commissionRate,
              total_bond: totalBond,
              total_voting_power: totalVotingPower,
              email: validator.email,
              website:
                validator?.website?.includes("Unknown website") ?
                  null
                : validator.website,
              discord_handle: validator.discord_handle,
            };

            return row;
          }
        );

        setRows(mappedRows);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };

    if (rows.length === 0) fetchData();
  }, [rows.length]);

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

  const handleRowClick = (params: any) => {
    setSelectedValidator({
      address: params.row.address,
      alias: params.row.alias,
    });
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedValidator(null);
  };

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

  const columns: GridColDef[] = [
    { field: "alias", headerName: "Name", flex: 1 },
    {
      field: "address",
      headerName: "Address",
      flex: 1,
      valueFormatter: (params: string) => shortenAddress(params),
    },
    {
      field: "commission",
      headerName: "Commission",
      type: "number",
      flex: 1,
      width: 100,
      headerAlign: "right",
      align: "right",
      valueFormatter: (params: number) => {
        return `${params.toFixed(2)}%`;
      },
    },
    {
      field: "total_bond",
      headerName: "Total Bond",
      type: "number",
      flex: 1,
      width: 150,
      valueFormatter: (params: number) =>
        params.toLocaleString(undefined, {
          minimumFractionDigits: 0,
          maximumFractionDigits: 2,
        }),
    },
    {
      field: "total_voting_power",
      headerName: "Voting Power (%)",
      type: "number",
      flex: 1,
      width: 150,
      valueFormatter: (params: number) => `${params}%`,
    },
    {
      field: "contact",
      headerName: "",
      renderCell: (params) => (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "4px",
          }}
        >
          {params.row.email && (
            <a
              href={`mailto:${params.row.email}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: "flex", alignItems: "center" }}
            >
              <EmailIcon sx={{ fontSize: "20px", mt: "15px" }} />
            </a>
          )}
          {params.row.website && (
            <a
              href={params.row.website}
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: "flex", alignItems: "center" }}
            >
              <LanguageIcon sx={{ fontSize: "20px", mt: "15px" }} />
            </a>
          )}
          {params.row.discord_handle && (
            <a
              href={`https://discord.com/users/${params.row.discord_handle}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: "flex", alignItems: "center" }}
            >
              <FaDiscord style={{ fontSize: "20px", marginTop: "15px" }} />
            </a>
          )}
        </div>
      ),
      sortable: false,
      resizable: false,
      disableColumnMenu: true,
      width: 100,
    },
  ];

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
          <Dialog
            open={dialogOpen}
            onClose={handleCloseDialog}
            maxWidth="md"
            fullWidth
          >
            <DialogTitle>{selectedValidator?.alias}</DialogTitle>
            <DialogContent>
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
                {extensionAttachStatus ===
                  ExtensionAttachStatus.NotInstalled && (
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
                {isExtensionConnected && rows.length > 0 && (
                  <GenesisBondForm
                    accounts={accounts}
                    validators={validators}
                  />
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
            </DialogContent>
            <DialogActions>
              <ActionButton onClick={handleCloseDialog}>Close</ActionButton>
            </DialogActions>
          </Dialog>
          <ContentContainer>
            <TopSection>
              <AppHeader />
            </TopSection>
            <div style={{ height: "800px", width: "75vw" }}>
              <DataGrid
                rows={rows}
                columns={columns}
                pageSizeOptions={[5, 10, 20]}
                onRowClick={handleRowClick}
                sx={{
                  "& .MuiDataGrid-row:hover": {
                    backgroundColor: "#eee",
                    cursor: "pointer",
                  },
                  "& .MuiDataGrid-columnHeaderTitle": {
                    fontWeight: "bold",
                  },
                  "& .MuiDataGrid-columnSeparator": {
                    display: "none",
                  },
                  "& .MuiDataGrid-row": {
                    backgroundColor: "white",
                    border: "1px solid black",
                  },
                  "& .MuiDataGrid-cell": {
                    borderBottom: "1px solid black",
                  },
                  "& .MuiDataGrid-columnHeaders": {
                    backgroundColor: "white",
                    borderBottom: "1px solid black",
                  },
                  // Add the following styles to make pagination visible
                  "& .MuiDataGrid-footerContainer": {
                    backgroundColor: "white",
                    color: "black",
                    borderTop: "1px solid black",
                  },
                  "& .MuiTablePagination-root": {
                    color: "black",
                  },
                  "& .MuiSvgIcon-root": {
                    color: "black",
                  },
                  "& .Mui-selected": {
                    backgroundColor: "rgb(255, 255, 0) !important", // Selected row color
                  },
                  "& .MuiDataGrid-cell:focus, & .MuiDataGrid-row:focus": {
                    outline: "none", // Remove focus outline
                  },
                }}
              />
            </div>

            {isModalOpen && (
              <Modal onClose={() => setIsModalOpen(false)}>
                <SettingsForm />
              </Modal>
            )}
            <BottomSection>
              <CardsContainer>
                <CallToActionCard
                  description="Read about pre genesis stage 2 and how to prepare for it"
                  title="PRE GENESIS INFO"
                  href={
                    "https://forum.namada.net/t/pre-genesis-stage-2-begins/962?u=gavin"
                  }
                />
                <CallToActionCard
                  description="What is Namada?"
                  title="NAMADA MISSION"
                  href={"https://forum.namada.net/t/the-namada-mission/275"}
                />
              </CardsContainer>
              <Faq />
              <div className=" mb-16 text-center text-sm text-black">
                This interface is provided by Everlasting validator as is. It's
                not "official" and it's not affiliated directly with Namada
                team. We don't take any responsibility in case your pre-bond
                transactions are not correctly included in the genesis block.
                Feel free to contact us in case you have any question.
                <br /> <br />
                Sourcecode of this ui can be found{" "}
                <a
                  href="https://github.com/ValidityOps/namada-interface-genesis-bond"
                  className="underline"
                  target="_blank"
                >
                  here
                </a>
                , along with all the namada-web-sdk modifications that we had to
                do to make this work.
              </div>
            </BottomSection>
          </ContentContainer>
        </AppContainer>
      </ThemeProvider>
    </AppContext.Provider>
  );
};

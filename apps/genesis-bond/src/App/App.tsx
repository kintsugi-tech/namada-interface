import { Star } from "@mui/icons-material";
import EmailIcon from "@mui/icons-material/Email";
import LanguageIcon from "@mui/icons-material/Language";

import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
} from "@mui/material";
import { DataGrid, GridColDef, GridSortCellParams } from "@mui/x-data-grid";
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
import { prBotTest } from "utils/prbot";
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

const VALIDITY_ADDR = "tnam1q8lhvxys53dlc8wzlg7dyqf9avd0vff6wvav4amt";

export const App: React.FC = () => {
  const initialColorMode = "dark";
  const chain = chains.namada;
  const integration = new Namada(chain);
  const [extensionAttachStatus, setExtensionAttachStatus] = useState(
    ExtensionAttachStatus.PendingDetection
  );
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedValidator, setSelectedValidator] =
    useState<ValidatorData | null>(null);
  const [rows, setRows] = useState<DataRow[]>([]);
  const [isExtensionConnected, setIsExtensionConnected] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [colorMode, _] = useState<ColorMode>(initialColorMode);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [settingsError, setSettingsError] = useState<string>();
  const theme = getTheme(colorMode);

  useEffect(() => {
    const fetchData = async (): Promise<void> => {
      try {
        const res = await fetch(
          "https://raw.githubusercontent.com/ValidityOps/namada-mainnet-genesis/main/validators_data.json"
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
              label:
                validator.alias ?
                  `${validator.alias} - ${validator.address}`
                : "Alias Unknown",
              value: validator.address,
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

        // Ensure VALIDITY_ADDR validator is at the top
        const sortedRows = mappedRows.sort((a, b) =>
          a.address === VALIDITY_ADDR ? -1
          : b.address === VALIDITY_ADDR ? 1
          : 0
        );

        setRows(sortedRows);
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

  const handleRowClick = (params: any): void => {
    setSelectedValidator(params.row);
    setDialogOpen(true);
  };

  const handleCloseDialog = (): void => {
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

  // Helper function to get row data by ID
  const getRowById = (id: any, api: any) => {
    return api.getRow(id);
  };

  const columns: GridColDef[] = [
    {
      field: "alias",
      headerName: "Name",
      flex: 1,
      renderCell: (params) => (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            fontWeight:
              params.row.address === VALIDITY_ADDR ? "bold" : "normal",
          }}
        >
          {params.row.address === VALIDITY_ADDR && (
            <Star sx={{ color: "#FFD700 !important", marginRight: "8px" }} />
          )}
          {params.value}
        </div>
      ),
      sortComparator: (
        v1,
        v2,
        param1: GridSortCellParams<any>,
        param2: GridSortCellParams<any>
      ) => {
        const row1 = getRowById(param1.id, param1.api);
        const row2 = getRowById(param2.id, param2.api);

        const isDescending =
          param1.api.state.sorting.sortModel[0].sort === "desc";

        if (row1.address === VALIDITY_ADDR && row2.address !== VALIDITY_ADDR) {
          return isDescending ? 1 : -1;
        } else if (
          row2.address === VALIDITY_ADDR &&
          row1.address !== VALIDITY_ADDR
        ) {
          return isDescending ? -1 : 1;
        }

        return v1.localeCompare(v2);
      },
    },
    {
      field: "address",
      headerName: "Address",
      flex: 1,
      valueFormatter: (params: string) => shortenAddress(params),
      cellClassName: (params) =>
        params.row.address === VALIDITY_ADDR ? "bold-cell" : "",
      sortComparator: (
        v1,
        v2,
        param1: GridSortCellParams<any>,
        param2: GridSortCellParams<any>
      ) => {
        const row1 = getRowById(param1.id, param1.api);
        const row2 = getRowById(param2.id, param2.api);

        const isDescending =
          param1.api.state.sorting.sortModel[0].sort === "desc";

        if (row1.address === VALIDITY_ADDR && row2.address !== VALIDITY_ADDR) {
          return isDescending ? 1 : -1;
        } else if (
          row2.address === VALIDITY_ADDR &&
          row1.address !== VALIDITY_ADDR
        ) {
          return isDescending ? -1 : 1;
        }

        return v1.localeCompare(v2);
      },
    },
    {
      field: "commission",
      headerName: "Commission",
      type: "number",
      flex: 1,
      width: 100,
      headerAlign: "right",
      align: "right",
      valueFormatter: (params: number) => `${params.toFixed(2)}%`,
      cellClassName: (params) =>
        params.row.address === VALIDITY_ADDR ? "bold-cell" : "",
      sortComparator: (
        v1,
        v2,
        param1: GridSortCellParams<any>,
        param2: GridSortCellParams<any>
      ) => {
        const row1 = getRowById(param1.id, param1.api);
        const row2 = getRowById(param2.id, param2.api);

        const isDescending =
          param1.api.state.sorting.sortModel[0].sort === "desc";

        if (row1.address === VALIDITY_ADDR && row2.address !== VALIDITY_ADDR) {
          return isDescending ? 1 : -1;
        } else if (
          row2.address === VALIDITY_ADDR &&
          row1.address !== VALIDITY_ADDR
        ) {
          return isDescending ? -1 : 1;
        }

        return v1 - v2;
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
      cellClassName: (params) =>
        params.row.address === VALIDITY_ADDR ? "bold-cell" : "",
      sortComparator: (
        v1,
        v2,
        param1: GridSortCellParams<any>,
        param2: GridSortCellParams<any>
      ) => {
        const row1 = getRowById(param1.id, param1.api);
        const row2 = getRowById(param2.id, param2.api);

        const isDescending =
          param1.api.state.sorting.sortModel[0].sort === "desc";

        if (row1.address === VALIDITY_ADDR && row2.address !== VALIDITY_ADDR) {
          return isDescending ? 1 : -1;
        } else if (
          row2.address === VALIDITY_ADDR &&
          row1.address !== VALIDITY_ADDR
        ) {
          return isDescending ? -1 : 1;
        }

        return v1 - v2;
      },
    },
    {
      field: "total_voting_power",
      headerName: "Voting Power (%)",
      type: "number",
      flex: 1,
      width: 150,
      valueFormatter: (params: number) => `${params}%`,
      cellClassName: (params) =>
        params.row.address === VALIDITY_ADDR ? "bold-cell" : "",
      sortComparator: (
        v1,
        v2,
        param1: GridSortCellParams<any>,
        param2: GridSortCellParams<any>
      ) => {
        const row1 = getRowById(param1.id, param1.api);
        const row2 = getRowById(param2.id, param2.api);

        const isDescending =
          param1.api.state.sorting.sortModel[0].sort === "desc";

        if (row1.address === VALIDITY_ADDR && row2.address !== VALIDITY_ADDR) {
          return isDescending ? 1 : -1;
        } else if (
          row2.address === VALIDITY_ADDR &&
          row1.address !== VALIDITY_ADDR
        ) {
          return isDescending ? -1 : 1;
        }

        return v1 - v2;
      },
    },
    {
      field: "contact",
      headerName: "",
      renderCell: (params) => (
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
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
              href={
                params.row.website.startsWith("https://") ?
                  params.row.website
                : `https://${params.row.website}`
              }
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
          {process.env.NODE_ENV === "development" && (
            <Button
              sx={{ height: 100, width: 100 }}
              variant="contained"
              onClick={() => prBotTest()}
            >
              Test PR Bot
            </Button>
          )}
          <Dialog
            open={dialogOpen}
            onClose={handleCloseDialog}
            maxWidth="md"
            fullWidth
          >
            <DialogTitle>
              <strong>{selectedValidator?.alias}</strong>
            </DialogTitle>
            <DialogContent>
              <>
                {selectedValidator ?
                  <div>
                    <p>
                      <strong>Address:</strong> {selectedValidator.address}
                    </p>
                    <p>
                      <strong>Commission:</strong>{" "}
                      {selectedValidator.commission}%
                    </p>
                    <p>
                      <strong>Total Bond:</strong>{" "}
                      {selectedValidator.total_bond}
                    </p>
                    <p>
                      <strong>Total Voting Power:</strong>{" "}
                      {selectedValidator.total_voting_power}%
                    </p>
                    {selectedValidator.email && (
                      <p>
                        <strong>Email:</strong> {selectedValidator.email}
                      </p>
                    )}
                    {selectedValidator.website && (
                      <p>
                        <strong>Website:</strong> {selectedValidator.website}
                      </p>
                    )}
                    {selectedValidator.discord_handle && (
                      <p>
                        <strong>Discord Handle:</strong>{" "}
                        {selectedValidator.discord_handle}
                      </p>
                    )}
                    <br />
                  </div>
                : <p>No validator selected</p>}
              </>

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
                        rel="noreferrer"
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
                    validators={selectedValidator ? [selectedValidator] : []}
                    allValidators={rows}
                    onValidatorChange={setSelectedValidator}
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
            <div style={{ height: "800px", width: "85vw", margin: "0 auto" }}>
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
                    backgroundColor: "rgb(255, 255, 0) !important",
                  },
                  "& .MuiDataGrid-cell:focus, & .MuiDataGrid-row:focus": {
                    outline: "none",
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
              <div className="mb-16 text-center text-sm text-black">
                This interface is provided by the ValidityOps validator as is.{" "}
                {`It's not "official" and it's not affiliated directly with Namada
                team. We don't take any responsibility in case your pre-bond`}
                transactions are not correctly included in the genesis block.
                Feel free to contact us in case you have any question.
                <br /> <br />
                Sourcecode of this ui can be found{" "}
                <a
                  href="https://github.com/ValidityOps/namada-interface-genesis-bond"
                  className="underline"
                  target="_blank"
                  rel="noreferrer"
                >
                  here
                </a>
                , along with all the namada-web-sdk modifications that{" "}
                <a
                  href="https://twitter.com/kintsugi_tech"
                  target="_blank"
                  rel="noreferrer"
                  className="underline"
                >
                  Kintsugi Tech
                </a>{" "}
                had to do to make this work.
                <br />
                <br />
                <strong>
                  We would *NOT* have been able to do this without the help of{" "}
                  <a
                    href="https://twitter.com/kintsugi_tech"
                    target="_blank"
                    rel="noreferrer"
                    className="underline"
                  >
                    Kintsugi Tech
                  </a>{" "}
                  and we are extremely grateful for their heavy lifting.
                </strong>
              </div>
              <div className="text-center font-bold mb-16 text-sm text-black"></div>
            </BottomSection>
          </ContentContainer>
        </AppContainer>
      </ThemeProvider>
    </AppContext.Provider>
  );
};

import { Panel } from "@namada/components";
import { assertNever } from "@namada/utils";
import { useState } from "react";

import { IbcFromNamada } from "./IbcFromNamada";
import { IbcToNamada } from "./IbcToNamada";

const tabs = ["cosmos->namada", "namada->cosmos"] as const;
type Tab = (typeof tabs)[number];

export const Ibc: React.FC = () => {
  const [selectedTab, setSelectedTab] = useState<Tab>(tabs[0]);

  const page =
    selectedTab === "cosmos->namada" ? <IbcToNamada />
    : selectedTab === "namada->cosmos" ? <IbcFromNamada />
    : assertNever(selectedTab);

  return (
    <>
      <Panel>
        {tabs.map((tab) => (
          <div key={tab}>
            <label>
              <input
                type="radio"
                value={tab}
                checked={selectedTab === tab}
                onChange={(e) => setSelectedTab(e.target.value as Tab)}
              ></input>
              {tab}
            </label>
          </div>
        ))}
      </Panel>

      {page}
    </>
  );
};

import { AppContext } from "App/App";
import React, { useContext } from "react";
import { Banner, BannerContents } from "./Banner.components";

export const AppBanner: React.FC = () => {
  const { isTestnetLive } = useContext(AppContext)!;
  return (
    <>
      {!isTestnetLive && (
        <Banner>
          <BannerContents>
            Testnet will go live Faucet is disabled until then.
          </BannerContents>
        </Banner>
      )}
    </>
  );
};

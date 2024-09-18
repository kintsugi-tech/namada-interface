import clsx from "clsx";
import { getSdkInstance } from "hooks";
import { useState } from "react";
import { Link } from "react-router-dom";
import { BurgerButton } from "./BurgerButton";
import { Logo } from "./Logo";

type ContainerProps = {
  header: JSX.Element;
  navigation: JSX.Element;
  children: JSX.Element;
} & React.ComponentPropsWithoutRef<"div">;

const vk =
  "zvknam1qd2rnxg5qqqqpq8s3ejhum4mmr50puzyuuv8klj3" +
  "uua76vevh2wnk4mlm7p65zvx9xaadwql4zp7m2vqwkm2yma" +
  "jskms5zf8r8gsmmxqq8w43j77kcz69pkyzvsxnjurfhm6tl" +
  "cst8wt8jqlw53n593p4ywswuu0058wsfrgjtaaxjh0acztk" +
  "mav06dvh3jqslw3ncpcuruy6qsdxpar455d7sza4um75vvc" +
  "s6h7sd96mxj6ghv29c6hrly5nh734r2vtpmyuy3rlacujs0l9";

export const AppContainer = ({
  header,
  navigation,
  children,
  ...props
}: ContainerProps): JSX.Element => {
  const [displayNavigation, setDisplayNavigation] = useState(false);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any)["shieldedSync"] = async () => {
    const { rpc } = await getSdkInstance();
    await rpc.shieldedSync([vk]);
    const asd = await rpc.queryBalance(vk, [
      "tnam1qxgfw7myv4dh0qna4hq0xdg6lx77fzl7dcem8h7e",
    ]);

    // eslint-disable-next-line no-console
    console.log(asd);
  };

  return (
    <div className="custom-container pb-2" {...props}>
      <header className="flex justify-between flex-wrap font-medium pt-4 pb-5 pl-4">
        <div className="flex items-center gap-4">
          <span className="xl:hidden">
            <BurgerButton
              open={displayNavigation}
              onClick={() => setDisplayNavigation(!displayNavigation)}
            />
          </span>
          <Link
            to={"/"}
            className={clsx(
              "flex items-center gap-3 text-yellow text-xl not-italic uppercase"
            )}
          >
            <i className="w-[40px]">
              <Logo eyeOpen={true} />
            </i>
            Namadillo
          </Link>
        </div>
        <div className="flex gap-8 items-center">{header}</div>
      </header>
      <div
        className={clsx(
          "grid xl:grid-cols-[220px_auto] xl:gap-2 min-h-[calc(100svh-95px)]"
        )}
      >
        <aside
          onClick={(e) => e.stopPropagation()}
          className={clsx(
            "transition-transform duration-500 ease-out-expo",
            "pt-10 bg-black rounded-sm fixed top-0 z-[9999] w-[240px]",
            "h-svh xl:h-[calc(100svh-90px)] left-0 xl:z-0 xl:transition-none",
            "xl:pt-0 xl:w-auto xl:relative",
            { "-translate-x-full xl:translate-x-0": !displayNavigation }
          )}
        >
          {navigation}
        </aside>
        <main className="min-h-full">{children}</main>
      </div>
    </div>
  );
};

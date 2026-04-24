import { type ReactNode } from "react";
import { PriceTrackingIcon } from "./PriceTrackingIcon";
import { priceTrackingMenuItems } from "./navigation";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger
} from "@/components/ui/navigation-menu";

type PriceTrackingNavigationProps = {
  themeMode: "dark" | "light";
  onToggleTheme: () => void;
  filterMenu?: ReactNode;
};

export function PriceTrackingNavigation({
  themeMode,
  onToggleTheme,
  filterMenu
}: PriceTrackingNavigationProps) {
  return (
    <>
      <div className="priceTrackingHeaderMain">
        <a className="priceTrackingHomeButton" href="#overview" title="หน้าแรก">
          <PriceTrackingIcon name="dashboard" />
        </a>

        <NavigationMenu viewport={false} className="navigationMenu">
          <NavigationMenuList>
            <NavigationMenuItem>
              <NavigationMenuTrigger>เมนู</NavigationMenuTrigger>
              <NavigationMenuContent className="navigationMenuContent">
                <div className="navigationMenuPanel">
                  {priceTrackingMenuItems.map((item) => (
                    <NavigationMenuLink key={item.label} asChild>
                      <a href={item.href} className="navigationMenuItem">
                        <strong>{item.label}</strong>
                        <span>{item.description}</span>
                      </a>
                    </NavigationMenuLink>
                  ))}
                </div>
              </NavigationMenuContent>
            </NavigationMenuItem>
          </NavigationMenuList>
        </NavigationMenu>
      </div>

      {filterMenu ? <div className="topbarFilterSlot">{filterMenu}</div> : null}

      <div className="topbarActions">
        <button
          type="button"
          className="topbarIconButton"
          onClick={onToggleTheme}
          aria-label={themeMode === "dark" ? "เปลี่ยนเป็นโหมดสว่าง" : "เปลี่ยนเป็นโหมดมืด"}
          title={themeMode === "dark" ? "เปลี่ยนเป็นโหมดสว่าง" : "เปลี่ยนเป็นโหมดมืด"}
        >
          <PriceTrackingIcon name={themeMode === "dark" ? "sun" : "moon"} />
        </button>
      </div>
    </>
  );
}

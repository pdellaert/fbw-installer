import React from "react";
import { FC } from "react";
import { NavLink } from "react-router-dom";
import { useIsDarkTheme } from "common/settings";
import { Publisher } from "renderer/utils/InstallerConfiguration";
import { useAppSelector } from "renderer/redux/store";
import { Gear, Wrench } from "react-bootstrap-icons";
import { InstallStatus } from "renderer/components/AddonSection/Enums";

export const NavBar: FC = ({ children }) => {
    const darkTheme = useIsDarkTheme();

    const bg = darkTheme ? 'bg-navy-dark' : 'bg-navy';

    return (
        <div className={`${bg} px-6 py-7 border-r border-navy-light flex flex-col justify-between h-full`}>
            <div className="flex flex-col gap-y-5">
                {children}
            </div>

            <div className="mt-auto flex flex-col gap-y-5">
                {process.env.NODE_ENV === 'development' && (
                    <NavbarItem to="/debug" className="border-none">
                        <Wrench className="text-gray-100" size={28} strokeWidth={1} />
                    </NavbarItem>
                )}
                <NavbarItem to="/settings" className="border-none">
                    <Gear className="text-gray-100" size={28} strokeWidth={1} />
                </NavbarItem>
            </div>
        </div>
    );
};

const BASE_STYLE = "w-20 h-20 flex flex-col justify-center items-center rounded-md bg-transparent hover:bg-navy-light transition duration-200 border-2 border-navy-light";

export interface NavBarItemProps {
    to: string;
    showNotification?: boolean;
    showUnverified?: boolean;
    notificationColor?: string;
    className?: string;
}

export const NavbarItem: FC<NavBarItemProps> = ({ to = '/', showNotification = false, showUnverified = false, notificationColor = 'orange', className, children }) => (
    <NavLink
        to={to}
        className={`${BASE_STYLE} ${className}`}
        activeClassName={`${BASE_STYLE} bg-navy-light`}
    >
        {children}

        <span className="absolute w-0 h-0" style={{ visibility: showUnverified ? 'visible' : 'hidden' }}>
            <svg viewBox="0 0 24 24" fill={notificationColor} className="relative w-8" style={{ left: '14px', bottom: '-10px' }}>
                <path fillRule="evenodd" d="M11.484 2.17a.75.75 0 011.032 0 11.209 11.209 0 007.877 3.08.75.75 0 01.722.515 12.74 12.74 0 01.635 3.985c0 5.942-4.064 10.933-9.563 12.348a.749.749 0 01-.374 0C6.314 20.683 2.25 15.692 2.25 9.75c0-1.39.223-2.73.635-3.985a.75.75 0 01.722-.516l.143.001c2.996 0 5.718-1.17 7.734-3.08zM12 8.25a.75.75 0 01.75.75v3.75a.75.75 0 01-1.5 0V9a.75.75 0 01.75-.75zM12 15a.75.75 0 00-.75.75v.008c0 .414.336.75.75.75h.008a.75.75 0 00.75-.75v-.008a.75.75 0 00-.75-.75H12z" clipRule="evenodd" />
            </svg>
        </span>
        <span className="absolute w-0 h-0" style={{ visibility: showNotification ? 'visible' : 'hidden' }}>
            <svg className="relative w-4" viewBox="0 0 10 10" style={{ left: '19px', bottom: '30px' }}>
                <circle cx={5} cy={5} r={5} fill={notificationColor} />
            </svg>
        </span>
    </NavLink>
);

export interface NavBarPublisherProps extends NavBarItemProps {
    publisher: Publisher;
}

export const NavBarPublisher: FC<NavBarPublisherProps> = ({ to, publisher }) => {
    const hasAvailableUpdates = useAppSelector((state) => {
        return publisher.addons.some((addon) => {
            const status = state.installStatus[addon.key]?.status;

            return status === InstallStatus.NeedsUpdate || status === InstallStatus.TrackSwitch;
        });
    });

    return (
        <NavbarItem
            to={to}
            showNotification={hasAvailableUpdates}
            showUnverified={publisher.verified !== undefined ? !publisher.verified : false}
            notificationColor="orange"
        >
            <img width={publisher.logoSize ?? 32} src={publisher.logoUrl} alt={`${publisher.name} Logo`}/>
        </NavbarItem>
    );
};

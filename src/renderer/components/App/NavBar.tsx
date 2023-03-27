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
                <path fillRule="evenodd" d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003zM12 8.25a.75.75 0 01.75.75v3.75a.75.75 0 01-1.5 0V9a.75.75 0 01.75-.75zm0 8.25a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd" />
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

import { useRef, useMemo, useState, useEffect, useContext, useCallback, createContext, } from 'react';
import { debounce } from 'lodash';
import { useRecoilState } from 'recoil';
import { useNavigate } from 'react-router-dom';
import { setTokenHeader, SystemRoles } from 'librechat-data-provider';
import { useGetRole, useGetUserQuery, useLoginUserMutation, useLogoutUserMutation, useRefreshTokenMutation, } from '~/data-provider';
import useTimeout from './useTimeout';
import store from '~/store';
const AuthContext = createContext(undefined);
const AuthContextProvider = ({ authConfig, children, }) => {
    const [user, setUser] = useRecoilState(store.user);
    const [token, setToken] = useState(undefined);
    const [error, setError] = useState(undefined);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const logoutRedirectRef = useRef(undefined);
    const { data: userRole = null } = useGetRole(SystemRoles.USER, {
        enabled: !!(isAuthenticated && (user?.role ?? '')),
    });
    const { data: adminRole = null } = useGetRole(SystemRoles.ADMIN, {
        enabled: !!(isAuthenticated && user?.role === SystemRoles.ADMIN),
    });
    const navigate = useNavigate();
    const setUserContext = useMemo(() => debounce((userContext) => {
        const { token, isAuthenticated, user, redirect } = userContext;
        setUser(user);
        setToken(token);
        //@ts-ignore - ok for token to be undefined initially
        setTokenHeader(token);
        setIsAuthenticated(isAuthenticated);
        // Use a custom redirect if set
        const finalRedirect = logoutRedirectRef.current || redirect;
        // Clear the stored redirect
        logoutRedirectRef.current = undefined;
        if (finalRedirect == null) {
            return;
        }
        if (finalRedirect.startsWith('http://') || finalRedirect.startsWith('https://')) {
            window.location.href = finalRedirect;
        }
        else {
            navigate(finalRedirect, { replace: true });
        }
    }, 50), [navigate, setUser]);
    const doSetError = useTimeout({ callback: (error) => setError(error) });
    const loginUser = useLoginUserMutation({
        onSuccess: (data) => {
            const { user, token, twoFAPending, tempToken } = data;
            if (twoFAPending) {
                // Redirect to the two-factor authentication route.
                navigate(`/login/2fa?tempToken=${tempToken}`, { replace: true });
                return;
            }
            setError(undefined);
            setUserContext({ token, isAuthenticated: true, user, redirect: '/c/new' });
        },
        onError: (error) => {
            const resError = error;
            doSetError(resError.message);
            navigate('/login', { replace: true });
        },
    });
    const logoutUser = useLogoutUserMutation({
        onSuccess: (data) => {
            setUserContext({
                token: undefined,
                isAuthenticated: false,
                user: undefined,
                redirect: data.redirect ?? '/login',
            });
        },
        onError: (error) => {
            doSetError(error.message);
            setUserContext({
                token: undefined,
                isAuthenticated: false,
                user: undefined,
                redirect: '/login',
            });
        },
    });
    const refreshToken = useRefreshTokenMutation();
    const logout = useCallback((redirect) => {
        if (redirect) {
            logoutRedirectRef.current = redirect;
        }
        logoutUser.mutate(undefined);
    }, [logoutUser]);
    const userQuery = useGetUserQuery({ enabled: !!(token ?? '') });
    const login = (data) => {
        loginUser.mutate(data);
    };
    const silentRefresh = useCallback(() => {
        if (authConfig?.test === true) {
            console.log('Test mode. Skipping silent refresh.');
            return;
        }
        refreshToken.mutate(undefined, {
            onSuccess: (data) => {
                const { user, token = '' } = data ?? {};
                if (token) {
                    setUserContext({ token, isAuthenticated: true, user });
                }
                else {
                    console.log('Token is not present. User is not authenticated.');
                    if (authConfig?.test === true) {
                        return;
                    }
                    navigate('/login');
                }
            },
            onError: (error) => {
                console.log('refreshToken mutation error:', error);
                if (authConfig?.test === true) {
                    return;
                }
                navigate('/login');
            },
        });
    }, []);
    useEffect(() => {
        if (userQuery.data) {
            setUser(userQuery.data);
        }
        else if (userQuery.isError) {
            doSetError(userQuery.error.message);
            navigate('/login', { replace: true });
        }
        if (error != null && error && isAuthenticated) {
            doSetError(undefined);
        }
        if (token == null || !token || !isAuthenticated) {
            silentRefresh();
        }
    }, [
        token,
        isAuthenticated,
        userQuery.data,
        userQuery.isError,
        userQuery.error,
        error,
        setUser,
        navigate,
        silentRefresh,
        setUserContext,
    ]);
    useEffect(() => {
        const handleTokenUpdate = (event) => {
            console.log('tokenUpdated event received event');
            const newToken = event.detail;
            setUserContext({
                token: newToken,
                isAuthenticated: true,
                user: user,
            });
        };
        window.addEventListener('tokenUpdated', handleTokenUpdate);
        return () => {
            window.removeEventListener('tokenUpdated', handleTokenUpdate);
        };
    }, [setUserContext, user]);
    // Make the provider update only when it should
    const memoedValue = useMemo(() => ({
        user,
        token,
        error,
        login,
        logout,
        setError,
        roles: {
            [SystemRoles.USER]: userRole,
            [SystemRoles.ADMIN]: adminRole,
        },
        isAuthenticated,
    }), [user, error, isAuthenticated, token, userRole, adminRole]);
    return <AuthContext.Provider value={memoedValue}>{children}</AuthContext.Provider>;
};
const useAuthContext = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuthContext should be used inside AuthProvider');
    }
    return context;
};
export { AuthContextProvider, useAuthContext, AuthContext };

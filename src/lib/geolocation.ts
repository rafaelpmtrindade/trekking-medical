export interface GeoPosition {
    latitude: number;
    longitude: number;
    altitude: number | null;
    accuracy: number;
}

export function getCurrentPosition(): Promise<GeoPosition> {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error('Geolocalização não suportada neste dispositivo'));
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                resolve({
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                    altitude: position.coords.altitude,
                    accuracy: position.coords.accuracy,
                });
            },
            (error) => {
                switch (error.code) {
                    case error.PERMISSION_DENIED:
                        reject(new Error('Permissão de localização negada. Ative nas configurações do celular.'));
                        break;
                    case error.POSITION_UNAVAILABLE:
                        reject(new Error('Localização indisponível. Verifique o GPS.'));
                        break;
                    case error.TIMEOUT:
                        reject(new Error('Tempo esgotado ao buscar localização.'));
                        break;
                    default:
                        reject(new Error('Erro ao obter localização.'));
                }
            },
            {
                enableHighAccuracy: true,
                timeout: 15000,
                maximumAge: 0,
            }
        );
    });
}

RegisterNetEvent('fivemredis:openUi', function(data)
    SendNUIMessage({
        action = 'openUI',
        data = data
    })
    SetNuiFocus(true, true)
end)

RegisterNUICallback('exit', function(_, cb)
    cb(true)
    SetNuiFocus(false, false)
end)

RegisterNUICallback('fetchResource', function(data, cb)
    TriggerServerEvent('fivemredis:fetchResource', data)
    cb(true)
end)

RegisterNetEvent('fivemredis:loadResource', function(data)
    SendNUIMessage({
        action = 'loadResource',
        data = data
    })
end)

import React, {useEffect, useState} from 'react';
import {
  StyleSheet,
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  PermissionsAndroid,
  FlatList,
} from 'react-native';

import Icon from 'react-native-vector-icons/FontAwesome';
import mapbox from '@mapbox/mapbox-sdk';
import mapboxDirections from '@mapbox/mapbox-sdk/services/directions';
import Geolocation from '@react-native-community/geolocation';
import MapboxGL from '@react-native-mapbox-gl/maps';
import AsyncStorage from '@react-native-community/async-storage';

const mapboxClient = mapbox({
  accessToken:
    'pk.eyJ1Ijoiam9zZXNhbmRvdmFscCIsImEiOiJja2F1OHRwbzAwbTUyMnVwaGRnazI1OHYzIn0.T_4I3ASdnmYBYKAM5iSvxQ',
});
const directionsClient = mapboxDirections(mapboxClient);

MapboxGL.setAccessToken(
  'pk.eyJ1Ijoiam9zZXNhbmRvdmFscCIsImEiOiJja2F1OHRwbzAwbTUyMnVwaGRnazI1OHYzIn0.T_4I3ASdnmYBYKAM5iSvxQ',
);

const QUITO_CENTER = [-78.507751, -0.208946];

const App = () => {
  const [centerCoordinate, setCenterCoordinate] = useState(QUITO_CENTER);
  const [waypoints, setWaypoints] = useState([]);

  const addWaypoint = event => {
    const newWaypoint = {coordinates: event.geometry.coordinates};
    setWaypoints([...waypoints, newWaypoint]);
  };

  const [todos, setTodos] = useState([]);
  useEffect(() => {
    AsyncStorage.getItem('todos')
      .then(response => {
        if (response !== null) {
          setTodos(JSON.parse(response));
        }
      })
      .catch(error => {});
  }, [todos]);

  const data = todos.map((todo, index) => ({
    id: index.toString(),
    direccion1: todo.dic1,
    direccion2: todo.dic2,
  }));

  function Item({title}) {
    return (
      <View style={styles.item}>
        <TouchableOpacity
          style={{...styles.buttonPlaces, backgroundColor: 'darkgrey'}}
          onPress={() => setNewCoordinates(title)}>
          <Text style={styles.text}>{title}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const list = (
    <FlatList
      data={data}
      renderItem={({item}) => (
        <Item title={item.direccion1 + ' -> ' + item.direccion2} />
      )}
      keyExtractor={item => item.id}
    />
  );

  const [directions, setDirections] = useState([]);
  const getDirections = async () => {
    if (waypoints.length >= 2) {
      directionsClient
        .getDirections({
          profile: 'driving',
          waypoints,
          geometries: 'geojson',
        })
        .send()
        .then(response => {
          setDirections(response.body.routes[0].geometry.coordinates);
        })
        .catch(error =>
          alert(
            'Asegurate que los marcadores se encuentran en una dirección válida',
          ),
        );

      let direccion1 = await fetch(
        'https://geocode.xyz/' +
          waypoints[0].coordinates[1] +
          ',' +
          waypoints[0].coordinates[0] +
          '?json=1&auth=802371203359246534665x6018',
      )
        .then(response => response.json())
        .then(json => {
          // console.log(json.staddress);
          return json.staddress;
        });

      let direccion2 = await fetch(
        'https://geocode.xyz/' +
          waypoints[1].coordinates[1] +
          ',' +
          waypoints[1].coordinates[0] +
          '?json=1&auth=802371203359246534665x6018',
      )
        .then(response => response.json())
        .then(json => {
          // console.log(json.staddress);
          return json.staddress;
        });

      const jsonValue = JSON.stringify([
        ...todos,
        // {name: direccion1 + ' -> ' + direccion2},
        {dic1: direccion1, dic2: direccion2},
      ]);
      // console.log(waypoints[0].coordinates[0]);

      AsyncStorage.setItem('todos', jsonValue).then(() =>
        console.log('POGGERS: ' + jsonValue),
      );
    }
  };

  const setNewCoordinates = datos => {
    alert(datos);
    // let coordenadas2 = await fetch(
    //   'https://geocode.xyz/' +
    //     waypoints[1].coordinates[1] +
    //     '?json=1&auth=802371203359246534665x6018',
    // )
    //   .then(response => response.json())
    //   .then(json => {
    //     console.log(json);
    //     return json;
    //   });
  };

  const route = {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: directions,
        },
      },
    ],
  };

  const setCurrentPosition = () => {
    PermissionsAndroid.check(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    ).then(granted => {
      if (granted) {
        Geolocation.getCurrentPosition(position => {
          const {latitude, longitude} = position.coords;
          setCenterCoordinate([longitude, latitude]);
        });
      }
    });
  };

  const reset = () => {
    setWaypoints([]);
    setDirections([]);
    setCurrentPosition();
  };

  const deleteAll = () => {
    AsyncStorage.clear();
    setTodos([]);
  };

  useEffect(() => {
    setCurrentPosition();
    MapboxGL.setTelemetryEnabled(false);
    MapboxGL.requestAndroidLocationPermissions();
  }, []);

  return (
    <>
      <View style={styles.container}>
        <MapboxGL.MapView
          attributionEnabled={false}
          logoEnabled={false}
          onPress={addWaypoint}
          style={styles.map}
          styleURL={MapboxGL.StyleURL.Street}>
          <MapboxGL.Camera
            zoomLevel={14}
            centerCoordinate={centerCoordinate}
            ce
          />

          {waypoints.map((waypoint, index) => (
            <MapboxGL.PointAnnotation
              key={index}
              anchor={{x: 0.5, y: 0.8}}
              coordinate={waypoint.coordinates}
              id="pt-ann">
              <Icon name="map-marker" size={35} color="#900" />
            </MapboxGL.PointAnnotation>
          ))}

          <MapboxGL.ShapeSource id="line" shape={route}>
            <MapboxGL.LineLayer
              id="linelayer"
              style={{lineColor: 'black', lineWidth: 4}}
            />
          </MapboxGL.ShapeSource>

          <MapboxGL.UserLocation />
        </MapboxGL.MapView>

        <TouchableOpacity style={styles.button} onPress={getDirections}>
          <Text style={styles.text}>Direcciones</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={{...styles.button, backgroundColor: '#81020E'}}
          onPress={reset}>
          <Text style={styles.text}>Reset</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={{...styles.button, backgroundColor: '#81020E'}}
          onPress={deleteAll}>
          <Text style={styles.text}>Borrar lista</Text>
        </TouchableOpacity>

        {list}
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  button: {
    marginTop: 10,
    marginHorizontal: 40,
    backgroundColor: 'grey',
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  buttonPlaces: {
    marginTop: 10,
    marginHorizontal: 80,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  text: {
    fontSize: 15,
    color: 'white',
  },
  container: {
    height: '100%',
    width: '100%',
    backgroundColor: 'black',
  },
  map: {
    flex: 1,
    borderStyle: 'solid',
    borderWidth: 5,
    borderColor: '#81020E',
  },
});

export default App;

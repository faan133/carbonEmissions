import React from 'react';
import { Map, InfoWindow, GoogleApiWrapper } from 'google-maps-react';

export class MapContainer extends React.Component {
  

  constructor(props) {
    super(props);

    this.state = {
      travelMode: props.travelMode
      
    };
    this.google = this.props.google;
    this.directionsService = new this.google.maps.DirectionsService();
  }

  onMapClicked() {
    const origin = this.props.origin;
    const destination = this.props.destination;
    const setCO2 = this.props.setEmittedCO2;
    if (!destination || !origin) {
      return;
    }
    const DirectionsDisplay = this.directionsDisplay;

    var footprintPromises = [
      this.getFootprint(
        this.directionsService,
        origin,
        destination,
        'TRANSIT'
        
      ),
      this.getFootprint(
        this.directionsService,
        origin,
        destination,
        'DRIVING'
            
      ),
      this.getFootprint(
        this.directionsService,
        origin,
        destination,
        'WALKING'
        
      ),
      this.getFootprint(
        this.directionsService,
        origin,
        destination,
        'BICYCLING'
        
      )
    ];

    Promise.all(footprintPromises).then(arr => {
      console.log(arr);

      var footprints = arr.reduce((acc, curr) => {
        acc[curr.travelMode] = curr;
        return acc;
      }, {});

      var bestRoute = footprints['DRIVING'];

      // if walking to feasible
      if (footprints['WALKING'].duration < 30) {
        bestRoute = footprints['WALKING'];
      } else {
        if (footprints['BICYCLING'].duration < 45) {
          bestRoute = footprints['BICYCLING'];
        } else {
          if (
            footprints['TRANSIT'].footprint <=
              footprints['DRIVING'].footprint &&
            footprints['TRANSIT'].duration - footprints['DRIVING'].duration < 30
          ) {
            bestRoute = footprints['TRANSIT'];
          }
        }
      }

      console.log(bestRoute);
      this.props.setTravelMode(bestRoute.travelMode);
      this.props.setEmittedCO2(bestRoute.footprint);
      DirectionsDisplay.setDirections(bestRoute.response);
      
    });

    
  }

  renderMapWithTMode = (travelMode = this.props.travelMode, option, time) => {
    console.log('Should update! Travel mode is ' + travelMode);

    var responsePromise = this.getFootprint(
      this.directionsService,
      this.props.origin,
      this.props.destination,
      
      travelMode,
      option,
      time
    );
    this.setState({ shouldUpdate: false });
    this.props.setShouldUpdateMap(false);
    responsePromise.then(promise => {
      this.props.setEmittedCO2(promise.footprint);
      this.directionsDisplay.setDirections(promise.response);
    });
  };

  getFootprint(
    DirectionsService,
    origin,
    destination,
    travelMode,
   
    option = 'departureTime',
    time = new Date()
  ) {
    return new Promise((resolve, reject) => {
      DirectionsService.route(
        {
          origin: origin,
          destination: destination,
          travelMode: travelMode,
          provideRouteAlternatives: true,
          transitOptions: {
            [option]: time
            
          }
        },
        (response, status) => {
          if (status === 'OK') {
            const distances = response.routes.map(route => {
              return parseFloat(route.legs[0].distance.text.split(' ')[0], 10);
            });
            const durations = response.routes.map(route => {
              var hours = parseFloat(
                (route.legs[0].duration.text.match(/[\d]+ hour/) || [0])[0],
                10
              );

              var minutes = parseFloat(
                (route.legs[0].duration.text.match(/[\d]+ min/) || [0])[0],
                10
              );

              var total = hours * 60 + minutes;
              return total;
            });

            const minDistance = Math.min(...distances);
            const minDuration = Math.min(...durations);
            var carbonEmissionInKg;

            switch (travelMode) {
              case 'DRIVING':
                carbonEmissionInKg = 0.251 * minDistance;
                break;
              case 'TRANSIT':
                carbonEmissionInKg = 0.129 * minDistance;
                break;
              default:
                carbonEmissionInKg = 0;
                break;
            }

            var footprintInfo = {
              travelMode: travelMode,
              duration: minDuration,
              distance: minDistance,
              footprint: carbonEmissionInKg,
              response: response
            };

            

            resolve(footprintInfo);
          } else {
            
            reject('Directions request failed due to ' + status);
          }
        }
      );
    });
  }

  onReady(mapProps, map) {
    const DirectionsDisplay = new this.google.maps.DirectionsRenderer();
    DirectionsDisplay.setMap(map);
    DirectionsDisplay.setPanel(document.getElementById('DirectionsPanel'));

    this['directionsDisplay'] = DirectionsDisplay;
    this.props.setRenderMapFunc(() => this.onMapClicked());
    this.props.setRenderMapFuncWithTMode(this.renderMapWithTMode);
  }

  

  render() {
    
    return (
      <Map
        google={this.props.google}
        zoom={14}
        initialCenter={this.props.initialCenter}
        onClick={this.onMapClicked.bind(this)}
        onReady={this.onReady.bind(this)}
      >
        <InfoWindow onClose={this.onInfoWindowClose}>
          <div />
        </InfoWindow>
      </Map>
    );
  }
}

export default GoogleApiWrapper({
  apiKey: 'AIzaSyDaV21H2rXlro4Dpob6crEO9YbqQxmvV-I'
})(MapContainer);
